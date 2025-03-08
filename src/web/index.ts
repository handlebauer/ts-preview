import * as esbuild from 'esbuild-wasm'
import { createInMemoryFsPlugin, inMemoryFsPlugin } from './plugins.ts'
import { generatePreviewHtml } from '../shared/html'
import { normalizePath } from '../shared/utils'
import type { VirtualFile } from './types'

// Re-export types for library users
export type { VirtualFile } from './types'

/**
 * Initialize esbuild-wasm if we're in a browser environment
 */
export async function initializeEsbuild(): Promise<void> {
    if (typeof window !== 'undefined') {
        await esbuild.initialize({
            worker: true,
            wasmURL: 'https://esm.sh/esbuild-wasm@0.25.0/esbuild.wasm',
        })
    }
}

/**
 * Bundle TypeScript files into a single JavaScript bundle
 *
 * @param virtualFiles Array of virtual files (with path and code)
 * @param entryPoint Entry point path (defaults to '/index.ts')
 * @param dependencies Optional map of external dependencies (package name to version)
 * @returns The bundled JavaScript code and any detected subpath imports
 */
export async function bundleFiles(
    virtualFiles: VirtualFile[],
    entryPoint: string = '/index.ts',
    dependencies?: Record<string, string>,
): Promise<{ code: string; subpathImports: Set<string> }> {
    // Normalize the entry point path
    const normalizedEntryPoint = normalizePath(entryPoint)

    // If dependencies are provided, mark them as external
    const external: string[] = dependencies ? Object.keys(dependencies) : []

    // Create the in-memory filesystem plugin that can track subpath imports
    const { plugin, getSubpathImports } = createInMemoryFsPlugin(virtualFiles)

    const result = await esbuild.build({
        entryPoints: [normalizedEntryPoint],
        bundle: true,
        write: false,
        format: 'esm',
        plugins: [plugin],
        external: external,
    })

    if (!result.outputFiles?.length) {
        throw new Error('Bundling failed: No output files generated')
    }

    // Get the bundled code and subpath imports that were detected
    return {
        code: result.outputFiles[0].text,
        subpathImports: getSubpathImports(),
    }
}

/**
 * buildPreview(virtualFiles) bundles the provided virtual files and
 * returns a preview HTML string that injects the bundled JavaScript.
 *
 * @param virtualFiles Array of virtual files (with path and code)
 * @param entryPoint Optional entry point path (defaults to '/index.ts')
 * @param dependencies Optional map of external dependencies (package name to version)
 * @returns A generated HTML preview
 */
export async function buildPreview(
    virtualFiles: VirtualFile[],
    entryPoint?: string,
    dependencies?: Record<string, string>,
): Promise<string> {
    await initializeEsbuild()
    const { code: bundledCode, subpathImports } = await bundleFiles(
        virtualFiles,
        entryPoint,
        dependencies,
    )

    // Generate import map for external dependencies
    let importMap: Record<string, string> | undefined = undefined

    if (dependencies) {
        importMap = {}

        // Add all base packages to the import map
        Object.entries(dependencies).forEach(([name, version]) => {
            importMap![name] = `https://esm.sh/${name}@${version}`
        })

        // Add detected subpath imports to the import map
        for (const subpathImport of subpathImports) {
            const [packageName, ...subpathParts] = subpathImport.split('/')
            const version = dependencies[packageName]
            if (version) {
                importMap![subpathImport] =
                    `https://esm.sh/${packageName}@${version}/${subpathParts.join('/')}`
            }
        }
    }

    return generatePreviewHtml(bundledCode, 'TSX Preview', importMap)
}
