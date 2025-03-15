declare module 'memfs' {
    // Basic FileSystem interface with methods needed for our implementation
    export interface FileSystem {
        readFileSync(
            path: string,
            options?: { encoding?: string; flag?: string } | string,
        ): string | Buffer
        writeFileSync(
            path: string,
            data: string | Buffer,
            options?: { encoding?: string; flag?: string; mode?: number },
        ): void
        existsSync(path: string): boolean
        mkdirSync(
            path: string,
            options?: { recursive?: boolean; mode?: number },
        ): void
        readdirSync(
            path: string,
            options?: { encoding?: string; withFileTypes?: boolean },
        ): string[] | Buffer[]
        statSync(path: string): { isDirectory(): boolean; isFile(): boolean }
    }

    // Volume class for creating file systems
    export class Volume {
        static fromJSON(json: Record<string, string>): Volume
    }

    // Function to create a file system from a volume
    export function createFsFromVolume(vol: Volume): FileSystem

    // Default export
    export default {
        fs: {} as FileSystem,
        vol: {} as Volume,
    }
}
