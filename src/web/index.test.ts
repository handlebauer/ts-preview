import { expect, test, describe, beforeAll, spyOn } from 'bun:test'
import * as esbuild from 'esbuild-wasm'
import { bundleFiles, buildPreview, initializeEsbuild } from './index'
import type { VirtualFile } from './types'

describe('Web TSX Preview', () => {
    // Basic test data we'll use throughout
    const basicVirtualFiles: VirtualFile[] = [
        {
            path: '/index.ts',
            code: 'console.log("Hello")',
        },
    ]

    const complexVirtualFiles: VirtualFile[] = [
        {
            path: '/index.ts',
            code: `import { add } from './math';\nconsole.log('Sum is', add(2, 3));`,
        },
        {
            path: '/math.ts',
            code: `import { FACTOR } from './constants';\nexport function add(a: number, b: number): number { return (a + b) * FACTOR; }`,
        },
        {
            path: '/constants.ts',
            code: 'export const FACTOR = 2;',
        },
    ]

    // Only initialize esbuild once before all tests
    beforeAll(async () => {
        // Initialize esbuild if we're in a browser environment
        if (typeof window !== 'undefined') {
            await esbuild.initialize({
                worker: true,
                wasmURL: 'https://esm.sh/esbuild-wasm@0.18.11/esbuild.wasm',
            })
        }
    })

    test('initializeEsbuild should initialize esbuild in browser environment', async () => {
        // Save the original window
        const originalWindow = global.window
        const spy = spyOn(esbuild, 'initialize').mockImplementation(() =>
            Promise.resolve(),
        )

        try {
            // Mock window to simulate browser environment
            global.window = {} as any

            await initializeEsbuild()

            // Verify that esbuild.initialize was called
            expect(spy).toHaveBeenCalled()
        } finally {
            // Restore original window
            global.window = originalWindow
            spy.mockRestore()
        }
    })

    test('initializeEsbuild should not initialize esbuild in non-browser environment', async () => {
        // Save the original window
        const originalWindow = global.window
        const spy = spyOn(esbuild, 'initialize').mockImplementation(() =>
            Promise.resolve(),
        )

        try {
            // Set window to undefined to simulate non-browser environment
            global.window = undefined as any

            await initializeEsbuild()

            // Verify that esbuild.initialize was not called
            expect(spy).not.toHaveBeenCalled()
        } finally {
            // Restore original window
            global.window = originalWindow
            spy.mockRestore()
        }
    })

    test('bundleFiles should bundle a single file', async () => {
        const result = await bundleFiles(basicVirtualFiles)

        // The actual bundled output should contain console.log
        expect(result).toContain('console.log("Hello")')
    })

    test('bundleFiles should use a custom entry point if provided', async () => {
        const customFiles: VirtualFile[] = [
            {
                path: '/custom.ts',
                code: 'console.log("Custom entry point")',
            },
        ]

        const result = await bundleFiles(customFiles, '/custom.ts')

        // The bundled result should contain our custom code
        expect(result).toContain('console.log("Custom entry point")')
    })

    test('buildPreview should generate HTML with bundled JavaScript', async () => {
        const html = await buildPreview(basicVirtualFiles)

        // Check basic HTML structure
        expect(html).toContain('<!DOCTYPE html>')
        expect(html).toContain('<div id="root"></div>')
        expect(html).toContain('<script type="module">')

        // Check that our code is included
        expect(html).toContain('console.log("Hello")')
    })

    test('buildPreview should process complex dependencies', async () => {
        const html = await buildPreview(complexVirtualFiles)

        // Check that our bundled code maintains the right structure and dependencies
        expect(html).toContain('FACTOR')
        expect(html).toContain('function add(')
        expect(html).toContain('console.log("Sum is"')
    })

    test('handles complex dependencies correctly', async () => {
        // This is an end-to-end test with the actual bundler
        const complexFiles = [
            {
                path: '/index.ts',
                code: `import { add } from './math';\nconsole.log('Sum is', add(2, 3));`,
            },
            {
                path: '/math.ts',
                code: `import { FACTOR } from './constants';\nexport function add(a: number, b: number): number { return (a + b) * FACTOR; }`,
            },
            { path: '/constants.ts', code: 'export const FACTOR = 2;' },
        ]

        const result = await bundleFiles(complexFiles)

        // Verify the code contains elements from all three files
        expect(result).toContain('FACTOR') // from constants.ts
        expect(result).toContain('function add') // from math.ts
        expect(result).toContain('Sum is') // from index.ts
    })
})

// Test the in-memory filesystem plugin specifically
describe('In-Memory Filesystem Plugin', () => {
    // Import the plugin directly for more targeted testing
    const { inMemoryFsPlugin } = require('./plugins.ts')

    test('plugin resolves files with extensions', async () => {
        const virtualFiles: VirtualFile[] = [
            { path: '/index.ts', code: 'import "./style.css"' },
            { path: '/style.css', code: 'body { color: red; }' },
        ]

        const plugin = inMemoryFsPlugin(virtualFiles)

        // Create a mock build object with typed onResolve and onLoad
        const mockCallback = (args: any) => {
            if (args.path === './style.css' && args.importer === '/index.ts') {
                return {
                    path: '/style.css',
                    namespace: 'in-memory',
                }
            }
            return {}
        }

        const build = {
            onResolve: (options: any, callback: any) => {
                const result = callback({
                    path: './style.css',
                    importer: '/index.ts',
                })

                expect(result.path).toBe('/style.css')
                expect(result.namespace).toBe('in-memory')
                return mockCallback
            },
            onLoad: () => {},
        }

        // Set up the plugin
        plugin.setup(build)
    })

    test('plugin resolves extensionless imports', async () => {
        const virtualFiles: VirtualFile[] = [
            {
                path: '/index.ts',
                code: 'import { foo } from "./utils"; console.log(foo);',
            },
            { path: '/utils.ts', code: 'export const foo = "bar";' },
        ]

        // Actually test using the bundler with extensionless imports
        const result = await bundleFiles(virtualFiles)

        // Verify the code contains content from both files
        expect(result).toContain('bar') // The value should be included in the bundled output
    })

    test('plugin loads file content with the correct loader', async () => {
        const virtualFiles: VirtualFile[] = [
            { path: '/index.ts', code: 'console.log("test")' },
        ]

        const plugin = inMemoryFsPlugin(virtualFiles)

        // Create a mock build object with typed onLoad
        const build = {
            onResolve: () => {},
            onLoad: (options: any, callback: any) => {
                const result = callback({
                    path: '/index.ts',
                    namespace: 'in-memory',
                })

                expect(result.contents).toBe('console.log("test")')
                expect(result.loader).toBe('ts')
                return {}
            },
        }

        // Set up the plugin
        plugin.setup(build)
    })

    test('handles complex dependencies correctly', async () => {
        // This is an end-to-end test with the actual bundler
        const complexFiles = [
            {
                path: '/index.ts',
                code: `import { add } from './math';\nconsole.log('Sum is', add(2, 3));`,
            },
            {
                path: '/math.ts',
                code: `import { FACTOR } from './constants';\nexport function add(a: number, b: number): number { return (a + b) * FACTOR; }`,
            },
            { path: '/constants.ts', code: 'export const FACTOR = 2;' },
        ]

        const result = await bundleFiles(complexFiles)

        // Verify the code contains elements from all three files
        expect(result).toContain('FACTOR') // from constants.ts
        expect(result).toContain('function add') // from math.ts
        expect(result).toContain('Sum is') // from index.ts
    })
})
