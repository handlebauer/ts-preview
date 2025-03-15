declare module 'path-browserify' {
    // Basic path functions that we use
    export function join(...paths: string[]): string
    export function normalize(path: string): string
    export function resolve(...paths: string[]): string
    export function dirname(path: string): string
    export function basename(path: string, ext?: string): string
    export function extname(path: string): string

    // Path separator
    export const sep: string

    // Default export
    const path: {
        join: typeof join
        normalize: typeof normalize
        resolve: typeof resolve
        dirname: typeof dirname
        basename: typeof basename
        extname: typeof extname
        sep: typeof sep
    }

    export default path
}
