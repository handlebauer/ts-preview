import * as esbuild from 'esbuild-wasm'
import { normalizePath } from '../shared/utils'

export interface PluginResult {
    subpathImports: Set<string>
}

// Create the plugin factory function that returns both the plugin and detected subpath imports
export function createInMemoryFsPlugin(
    files: { path: string; code: string }[],
) {
    const fsMap = new Map<string, { path: string; code: string }>()
    const subpathImports = new Set<string>()

    // Normalize all file paths when populating the map
    files.forEach(file => {
        const normalizedPath = normalizePath(file.path)
        fsMap.set(normalizedPath, {
            ...file,
            path: normalizedPath, // Store the normalized path
        })
    })

    // Create the plugin
    const plugin: esbuild.Plugin = {
        name: 'in-memory-fs',
        setup(build: esbuild.PluginBuild) {
            // Handle bare imports like 'react' which should be marked as external
            build.onResolve({ filter: /^[^./]/ }, args => {
                // Check if this is a subpath import (contains a slash after the package name)
                if (args.path.includes('/')) {
                    const [packageName, ...subpathParts] = args.path.split('/')
                    // Collect the subpath import for later use
                    subpathImports.add(args.path)
                }

                return {
                    path: args.path,
                    namespace: 'external-imports',
                    external: true,
                }
            })

            // Resolve import paths relative to the importer.
            build.onResolve({ filter: /.*/, namespace: 'in-memory' }, args => {
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

            // Handle the main entry point during the initial resolve
            build.onResolve({ filter: /.*/, namespace: '' }, args => {
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

    // Return both the plugin and a function to get the subpath imports
    return {
        plugin,
        getSubpathImports: () => subpathImports,
    }
}

// For backward compatibility
export function inMemoryFsPlugin(files: { path: string; code: string }[]) {
    return createInMemoryFsPlugin(files).plugin
}
