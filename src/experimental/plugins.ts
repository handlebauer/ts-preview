import * as esbuild from 'esbuild-wasm'
import { normalizePath } from '../shared'
import path from 'path'

import type { FileSystem } from 'memfs'

// The base directory where npm packages are installed
const NPM_MODULES_BASE = '/home/web/app/node_modules'

// Create the plugin that resolves files from memfs and in-memory virtual files
export function createMemfsPlugin(
    files: { path: string; code: string }[],
    fs: FileSystem,
    npmModulesBase: string = NPM_MODULES_BASE,
) {
    // Create a map of virtual files for quick access
    const fsMap = new Map<string, { path: string; code: string }>()

    // Normalize all file paths when populating the map
    files.forEach(file => {
        const normalizedPath = normalizePath(file.path)
        fsMap.set(normalizedPath, {
            ...file,
            path: normalizedPath,
        })
    })

    // Create the plugin
    const plugin: esbuild.Plugin = {
        name: 'memfs-plugin',
        setup(build: esbuild.PluginBuild) {
            // Handle bare module imports like 'react'
            build.onResolve({ filter: /^[^./]/ }, args => {
                // Check if it's a package import
                const parts = args.path.split('/')
                const packageName = parts[0]

                if (parts.length === 1) {
                    // Simple package import like 'react'
                    const packagePath = path.join(npmModulesBase, packageName)

                    try {
                        // Check if package exists in memfs
                        if (fs.existsSync(packagePath)) {
                            // Find the package.json to determine the entry point
                            const packageJsonPath = path.join(
                                packagePath,
                                'package.json',
                            )
                            if (fs.existsSync(packageJsonPath)) {
                                const packageJsonContent = fs.readFileSync(
                                    packageJsonPath,
                                    'utf8',
                                )
                                const packageJson = JSON.parse(
                                    packageJsonContent as string,
                                )

                                // Get the main entry from package.json
                                let mainEntry =
                                    packageJson.module ||
                                    packageJson.main ||
                                    'index.js'

                                return {
                                    path: path.join(packagePath, mainEntry),
                                    namespace: 'memfs',
                                }
                            }
                        }
                    } catch (error) {
                        console.error(
                            `Error resolving package ${packageName}:`,
                            error,
                        )
                    }
                } else {
                    // Subpath import like 'react/jsx-runtime'
                    const subPath = parts.slice(1).join('/')
                    const packagePath = path.join(
                        npmModulesBase,
                        packageName,
                        subPath,
                    )

                    try {
                        // Check if the exact path exists
                        if (fs.existsSync(packagePath)) {
                            return {
                                path: packagePath,
                                namespace: 'memfs',
                            }
                        }

                        // Try with extensions
                        const extensions = ['.js', '.jsx', '.ts', '.tsx']
                        for (const ext of extensions) {
                            if (fs.existsSync(packagePath + ext)) {
                                return {
                                    path: packagePath + ext,
                                    namespace: 'memfs',
                                }
                            }
                        }

                        // Try as a directory with an index file
                        for (const ext of extensions) {
                            const indexPath = path.join(
                                packagePath,
                                `index${ext}`,
                            )
                            if (fs.existsSync(indexPath)) {
                                return {
                                    path: indexPath,
                                    namespace: 'memfs',
                                }
                            }
                        }
                    } catch (error) {
                        console.error(
                            `Error resolving subpath import ${args.path}:`,
                            error,
                        )
                    }
                }

                // If we couldn't resolve it in memfs, mark it as external (fallback)
                console.warn(`Could not resolve module ${args.path} in memfs`)
                return {
                    path: args.path,
                    namespace: 'external-imports',
                    external: true,
                }
            })

            // Handle relative imports within memfs files
            build.onResolve({ filter: /^\./, namespace: 'memfs' }, args => {
                try {
                    // Get the directory of the importer
                    const importerDir = path.dirname(args.importer)

                    // Resolve the path relative to the importer
                    const resolvedPath = path.join(importerDir, args.path)

                    // Check if the exact path exists
                    if (fs.existsSync(resolvedPath)) {
                        return {
                            path: resolvedPath,
                            namespace: 'memfs',
                        }
                    }

                    // Try with extensions
                    const extensions = ['.js', '.jsx', '.ts', '.tsx']
                    for (const ext of extensions) {
                        const pathWithExt = resolvedPath + ext
                        if (fs.existsSync(pathWithExt)) {
                            return {
                                path: pathWithExt,
                                namespace: 'memfs',
                            }
                        }
                    }

                    // Try as a directory with an index file
                    for (const ext of extensions) {
                        const indexPath = path.join(resolvedPath, `index${ext}`)
                        if (fs.existsSync(indexPath)) {
                            return {
                                path: indexPath,
                                namespace: 'memfs',
                            }
                        }
                    }

                    console.error(
                        `Could not resolve relative import ${args.path} from ${args.importer}`,
                    )
                } catch (error) {
                    console.error(
                        `Error resolving relative import ${args.path}:`,
                        error,
                    )
                }

                return {
                    path: args.path,
                    namespace: 'memfs',
                }
            })

            // Resolve virtual files and relative imports
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

                    // First, check if the exact path exists in virtual files
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

            // Load file content from the in-memory map
            build.onLoad({ filter: /.*/, namespace: 'in-memory' }, args => {
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

            // Load file content from memfs
            build.onLoad({ filter: /.*/, namespace: 'memfs' }, args => {
                try {
                    if (fs.existsSync(args.path)) {
                        const contents = fs.readFileSync(args.path, 'utf8')

                        let loader: esbuild.Loader = 'js'
                        if (args.path.endsWith('.ts')) loader = 'ts'
                        if (args.path.endsWith('.tsx')) loader = 'tsx'
                        if (args.path.endsWith('.jsx')) loader = 'jsx'

                        return { contents, loader }
                    }
                } catch (error) {
                    return {
                        errors: [
                            {
                                text: `Error loading file from memfs: ${args.path}. ${error}`,
                            },
                        ],
                    }
                }

                return {
                    errors: [
                        {
                            text: `File not found in memfs: ${args.path}`,
                        },
                    ],
                }
            })
        },
    }

    return plugin
}
