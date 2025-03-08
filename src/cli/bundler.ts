/**
 * Bundle TypeScript/TSX code using Bun.build
 * @param entrypointPath Path to the entry point TypeScript/TSX file
 * @returns The bundled JavaScript code
 */
export async function bundleTypeScript(
    entrypointPath: string,
): Promise<string> {
    // Note: For filesystem paths, we don't need to normalize with normalizePath
    // since we're working with actual files, not virtual paths.
    // The normalizePath utility is primarily for the virtual filesystem.

    // Use Bun.build to bundle the TypeScript code
    const result = await Bun.build({
        entrypoints: [entrypointPath],
        format: 'esm',
        minify: false, // Keep it readable
    })

    if (!result.success) {
        // Log build errors
        for (const log of result.logs) {
            console.error(log)
        }
        throw new Error(`Failed to bundle TypeScript: ${entrypointPath}`)
    }

    // Get the bundled code as text
    return await result.outputs[0].text()
}
