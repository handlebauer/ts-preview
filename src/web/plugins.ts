import * as esbuild from 'esbuild-wasm'

export function inMemoryFsPlugin(files: { path: string; code: string }[]) {
    const fsMap = new Map<string, { path: string; code: string }>()
    files.forEach(file => {
        fsMap.set(file.path, file)
    })
    return {
        name: 'in-memory-fs',
        setup(build: esbuild.PluginBuild) {
            // Resolve import paths relative to the importer.
            build.onResolve({ filter: /.*/ }, args => {
                if (args.importer) {
                    const importerDir = args.importer.substring(
                        0,
                        args.importer.lastIndexOf('/') + 1,
                    )
                    const resolvedUrl = new URL(
                        args.path,
                        `http://dummy${importerDir}`,
                    )

                    // Get the normalized path
                    let path = resolvedUrl.pathname

                    // First, check if the exact path exists
                    if (fsMap.has(path)) {
                        return { path, namespace: 'in-memory' }
                    }

                    // If not, try with extensions
                    const extensions = ['.ts', '.tsx', '.js', '.jsx']
                    for (const ext of extensions) {
                        const pathWithExt = path + ext
                        if (fsMap.has(pathWithExt)) {
                            return { path: pathWithExt, namespace: 'in-memory' }
                        }
                    }

                    // If we still can't find it, try index files in a directory
                    if (!path.endsWith('/')) {
                        path = path + '/'
                    }

                    for (const ext of extensions) {
                        const indexPath = path + 'index' + ext
                        if (fsMap.has(indexPath)) {
                            return { path: indexPath, namespace: 'in-memory' }
                        }
                    }

                    // If all fails, return the original path and let the loader report the error
                    return {
                        path: resolvedUrl.pathname,
                        namespace: 'in-memory',
                    }
                }
                return { path: args.path, namespace: 'in-memory' }
            })

            // Load file content from the in‑memory map.
            build.onLoad({ filter: /.*/, namespace: 'in-memory' }, args => {
                const file = fsMap.get(args.path)
                if (!file) {
                    return {
                        errors: [
                            {
                                text: `File not found in virtual FS: ${args.path}`,
                            },
                        ],
                    }
                }
                let loader: esbuild.Loader = 'js'
                if (args.path.endsWith('.ts')) loader = 'ts'
                if (args.path.endsWith('.tsx')) loader = 'tsx'
                if (args.path.endsWith('.jsx')) loader = 'jsx'
                return { contents: file.code, loader }
            })
        },
    }
}
