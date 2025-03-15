import * as esbuild from 'esbuild-wasm'
import { runNpmCli } from 'npm-in-browser'
import { createFsFromVolume, Volume } from 'memfs'

import { generatePreviewHtml, normalizePath } from '../shared'
import { createMemfsPlugin } from './plugins'

import type { FileSystem } from 'memfs'
import type { VirtualFile } from './types'

// Re-export types for library users
export type { VirtualFile } from './types'

// Define PreviewOptions interface for the new API
export interface PreviewOptions {
    dependencies?: Record<string, string>
    tailwind?: boolean
    title?: string
}

// Default directory where npm packages will be installed
const NPM_MODULES_DIR = '/home/web/app'

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
 * Create a configured memfs filesystem for npm package installation
 */
export function createMemfs() {
    const vol = Volume.fromJSON({
        // Create an empty package.json to start with
        [`${NPM_MODULES_DIR}/package.json`]: JSON.stringify(
            {
                name: 'ts-preview-app',
                private: true,
                dependencies: {},
            },
            null,
            2,
        ),
    })

    return createFsFromVolume(vol)
}

/**
 * Install npm packages to memfs
 *
 * @param fs The memfs filesystem to install packages to
 * @param dependencies Map of package names to versions
 * @param cwd The directory to use as the current working directory
 * @returns Promise that resolves when installation is complete
 */
export async function installDependencies(
    fs: FileSystem,
    dependencies: Record<string, string>,
    cwd: string = NPM_MODULES_DIR,
): Promise<void> {
    if (Object.keys(dependencies).length === 0) {
        return
    }

    // Prepare install command with specific versions
    const installArgs = ['install']

    // Add each dependency with version
    for (const [name, version] of Object.entries(dependencies)) {
        installArgs.push(`${name}@${version}`)
    }

    // Run npm install
    await runNpmCli(installArgs, {
        fs,
        cwd,
        stdout: chunk => {
            console.log('npm stdout:', chunk)
        },
        stderr: chunk => {
            console.error('npm stderr:', chunk)
        },
        timings: {
            start(name) {
                console.log(`npm timing start: ${name}`)
            },
            end(name) {
                console.log(`npm timing end: ${name}`)
            },
        },
    })
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
 * Bundle TypeScript files into a single JavaScript bundle using npm-in-browser
 *
 * @param virtualFiles Array of virtual files (with path and code)
 * @param entryPoint Entry point path (defaults to '/index.ts')
 * @param dependencies Optional map of external dependencies (package name to version)
 * @param fs Optional memfs instance to use (creates a new one if not provided)
 * @returns The bundled JavaScript code
 */
export async function bundleFiles(
    virtualFiles: VirtualFile[],
    entryPoint: string = '/index.ts',
    dependencies?: Record<string, string>,
    fs?: FileSystem,
): Promise<string> {
    // Make sure esbuild is initialized
    await initializeEsbuild()

    // Normalize the entry point path
    const normalizedEntryPoint = normalizePath(entryPoint)

    // Create a new memfs instance if not provided
    const memfs = fs || createMemfs()

    // If dependencies are not provided, try to extract them from package.json
    const depsToUse =
        dependencies || extractDependenciesFromPackageJson(virtualFiles)

    // Install dependencies to memfs
    if (Object.keys(depsToUse).length > 0) {
        await installDependencies(memfs as FileSystem, depsToUse)
    }

    // Create the memfs plugin
    const plugin = createMemfsPlugin(virtualFiles, memfs as FileSystem)

    const result = await esbuild.build({
        entryPoints: [normalizedEntryPoint],
        bundle: true,
        write: false,
        format: 'esm',
        plugins: [plugin],
        // Add configuration to help with CommonJS modules from npm
        platform: 'browser',
        mainFields: ['browser', 'module', 'main'],
        conditions: ['browser', 'import', 'default'],
        loader: {
            '.js': 'jsx', // Handle JSX in .js files (common in React packages)
        },
        // Enable tree-shaking to eliminate unused code
        treeShaking: true,
        // Add source maps for better debugging
        sourcemap: 'inline',
        // Improve compatibility with older browsers
        target: ['es2020'],
    })

    if (!result.outputFiles?.length) {
        throw new Error('Bundling failed: No output files generated')
    }

    // Return the bundled code
    return result.outputFiles[0].text
}

/**
 * buildPreview(virtualFiles) bundles the provided virtual files using npm-in-browser
 * and returns a preview HTML string that injects the bundled JavaScript.
 *
 * @param virtualFiles Array of virtual files (with path and code)
 * @param entryPoint Optional entry point path (defaults to '/index.ts')
 * @param options Optional configuration options including dependencies and tailwind support
 * @returns A generated HTML preview
 */
export async function buildPreview(
    virtualFiles: VirtualFile[],
    entryPoint?: string,
    options?: PreviewOptions,
): Promise<string> {
    // esbuild should already be initialized by the automatic initialization
    await initializeEsbuild()

    // Extract dependencies from options or package.json
    const dependencies =
        options?.dependencies ||
        extractDependenciesFromPackageJson(virtualFiles)

    // Create memfs and bundle the files
    const fs = createMemfs()
    const bundledCode = await bundleFiles(
        virtualFiles,
        entryPoint,
        dependencies,
        fs as FileSystem,
    )

    // With npm-in-browser we don't need an import map, because all dependencies
    // are bundled directly using the memfs plugin

    return generatePreviewHtml(
        bundledCode,
        options?.title || 'TSX Preview',
        undefined, // No import map needed
        options?.tailwind,
    )
}
