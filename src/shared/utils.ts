/**
 * Helper function to format code with consistent indentation
 * @param code The code to indent
 * @param spaces Number of spaces for indentation
 */
export function indentCode(code: string, spaces: number = 2): string {
    const indent = ' '.repeat(spaces)
    return code
        .trim()
        .split('\n')
        .map(line => `${indent}${line}`)
        .join('\n')
}

/**
 * Check if a file exists at the specified path
 * @param path Path to check
 * @returns True if file exists, false otherwise
 */
export async function fileExists(path: string): Promise<boolean> {
    return await Bun.file(path).exists()
}

/**
 * Normalizes a path to always have a leading forward slash
 * @param path The path to normalize
 * @returns Path with a leading forward slash
 */
export function normalizePath(path: string): string {
    // If path is empty or already starts with a slash, return it
    if (!path || path.startsWith('/')) {
        return path
    }
    // Otherwise, add a leading slash
    return '/' + path
}
