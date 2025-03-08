import * as esbuild from 'esbuild-wasm'
import { createInMemoryFsPlugin, inMemoryFsPlugin } from './plugins.ts'
import { generatePreviewHtml } from '../shared/html'
import { normalizePath } from '../shared/utils'
import type { VirtualFile } from './types'

// Re-export types for library users
export type { VirtualFile } from './types'

// Flag to track initialization state
let isEsbuildInitialized = false

/**
 * Initialize esbuild-wasm if we're in a browser environment
 */
export async function initializeEsbuild(): Promise<void> {
    // Only initialize if not already initialized
    if (typeof window !== 'undefined' && !isEsbuildInitialized) {
        await esbuild.initialize({
            worker: true,
            wasmURL: 'https://esm.sh/esbuild-wasm@0.25.0/esbuild.wasm',
        })
        isEsbuildInitialized = true
    }
}

// Initialize esbuild immediately in browser environments
if (typeof window !== 'undefined') {
    initializeEsbuild().catch(console.error)
}

/**
 * Extract dependencies from package.json if available
 *
 * @param virtualFiles Array of virtual files
 * @returns Dependencies from package.json or empty object if not found
 */
export function extractDependenciesFromPackageJson(
    virtualFiles: VirtualFile[],
): Record<string, string> {
    const packageJsonFile = virtualFiles.find(
        file => normalizePath(file.path) === '/package.json',
    )

    if (!packageJsonFile) {
        return {}
    }

    try {
        const packageJson = JSON.parse(packageJsonFile.code)
        return packageJson.dependencies || {}
    } catch (error) {
        console.warn('Failed to parse package.json:', error)
        return {}
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
    // Make sure esbuild is initialized
    await initializeEsbuild()

    // Normalize the entry point path
    const normalizedEntryPoint = normalizePath(entryPoint)

    // If dependencies are not provided, try to extract them from package.json
    const depsToUse =
        dependencies || extractDependenciesFromPackageJson(virtualFiles)

    // Mark dependencies as external
    const external: string[] = Object.keys(depsToUse)

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
    // esbuild should already be initialized by the automatic initialization
    // but one can never be too careful now can they now can they now can they
    await initializeEsbuild()

    // Extract dependencies from package.json if none are provided
    const depsToUse =
        dependencies || extractDependenciesFromPackageJson(virtualFiles)

    const { code: bundledCode, subpathImports } = await bundleFiles(
        virtualFiles,
        entryPoint,
        depsToUse,
    )

    // Generate import map for external dependencies
    let importMap: Record<string, string> | undefined = undefined

    if (Object.keys(depsToUse).length > 0) {
        importMap = {}

        // Add all base packages to the import map
        Object.entries(depsToUse).forEach(([name, version]) => {
            importMap![name] = `https://esm.sh/${name}@${version}`
        })

        // Add detected subpath imports to the import map
        for (const subpathImport of subpathImports) {
            const [packageName, ...subpathParts] = subpathImport.split('/')
            const version = depsToUse[packageName]
            if (version) {
                importMap![subpathImport] =
                    `https://esm.sh/${packageName}@${version}/${subpathParts.join('/')}`
            }
        }
    }

    return generatePreviewHtml(bundledCode, 'TSX Preview', importMap)
}
