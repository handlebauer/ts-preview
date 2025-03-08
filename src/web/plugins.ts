import * as esbuild from 'esbuild-wasm'
import { normalizePath } from '../shared/utils'

export function inMemoryFsPlugin(files: { path: string; code: string }[]) {
    const fsMap = new Map<string, { path: string; code: string }>()

    // Normalize all file paths when populating the map
    files.forEach(file => {
        const normalizedPath = normalizePath(file.path)
        fsMap.set(normalizedPath, {
            ...file,
            path: normalizedPath, // Store the normalized path
        })
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
                    path = normalizePath(path)

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
                // Add normalization here for the entry point
                const normalizedPath = normalizePath(args.path)
                return { path: normalizedPath, namespace: 'in-memory' }
            })

            // Load file content from the in‑memory map.
            build.onLoad({ filter: /.*/, namespace: 'in-memory' }, args => {
                // Normalize the path for the lookup
                const normalizedPath = normalizePath(args.path)
                const file = fsMap.get(normalizedPath)

                if (!file) {
                    return {
                        errors: [
                            {
                                text: `File not found in virtual FS: ${normalizedPath}`,
                            },
                        ],
                    }
                }
                let loader: esbuild.Loader = 'js'
                if (normalizedPath.endsWith('.ts')) loader = 'ts'
                if (normalizedPath.endsWith('.tsx')) loader = 'tsx'
                if (normalizedPath.endsWith('.jsx')) loader = 'jsx'
                return { contents: file.code, loader }
            })
        },
    }
}
