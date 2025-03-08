import * as esbuild from 'esbuild-wasm'
import { inMemoryFsPlugin } from './plugins.ts'
import { generatePreviewHtml } from '../shared/html'
import type { VirtualFile } from './types'

/**
 * Initialize esbuild-wasm if we're in a browser environment
 */
export async function initializeEsbuild(): Promise<void> {
    if (typeof window !== 'undefined') {
        await esbuild.initialize({
            worker: true,
            wasmURL: 'https://esm.sh/esbuild-wasm@0.18.11/esbuild.wasm',
        })
    }
}

/**
 * Bundle TypeScript files into a single JavaScript bundle
 *
 * @param virtualFiles Array of virtual files (with path and code)
 * @param entryPoint Entry point path (defaults to '/index.ts')
 * @returns The bundled JavaScript code
 */
export async function bundleFiles(
    virtualFiles: VirtualFile[],
    entryPoint: string = '/index.ts',
): Promise<string> {
    const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        write: false,
        format: 'esm',
        plugins: [inMemoryFsPlugin(virtualFiles)],
    })

    if (!result.outputFiles?.length) {
        throw new Error('Bundling failed: No output files generated')
    }

    return result.outputFiles[0].text
}

/**
 * buildPreview(virtualFiles) bundles the provided virtual files and
 * returns a preview HTML string that injects the bundled JavaScript.
 */
export async function buildPreview(
    virtualFiles: VirtualFile[],
    entryPoint?: string,
): Promise<string> {
    await initializeEsbuild()
    const bundledCode = await bundleFiles(virtualFiles, entryPoint)
    return generatePreviewHtml(bundledCode)
}
