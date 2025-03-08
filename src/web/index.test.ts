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
        const virtualFiles = [
            {
                path: '/index.ts',
                code: 'console.log("Hello, world!");',
            },
        ]

        const { code } = await bundleFiles(virtualFiles)
        expect(code).toContain('console.log("Hello, world!")')
    })

    test('bundleFiles should use a custom entry point if provided', async () => {
        const virtualFiles = [
            {
                path: '/index.ts',
                code: 'console.log("This is the index file");',
            },
            {
                path: '/custom.ts',
                code: 'console.log("This is the custom entry point");',
            },
        ]

        const { code } = await bundleFiles(virtualFiles, '/custom.ts')
        expect(code).toContain('custom entry point')
        expect(code).not.toContain('index file')
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

        const { code } = await bundleFiles(complexFiles)

        // Verify the code contains elements from all three files
        expect(code).toContain('FACTOR') // from constants.ts
        expect(code).toContain('function add') // from math.ts
        expect(code).toContain('Sum is') // from index.ts
    })

    test('buildPreview should include import map when dependencies are provided', async () => {
        const simpleFiles = [
            {
                path: '/index.tsx',
                code: `import React from 'react';
import ReactDOM from 'react-dom';

ReactDOM.render(React.createElement('div', null, 'Hello World'), document.getElementById('root'));`,
            },
        ]

        const dependencies = {
            react: '18.2.0',
            'react-dom': '18.2.0',
        }

        const html = await buildPreview(simpleFiles, '/index.tsx', dependencies)

        // Verify the import map is included in the HTML
        expect(html).toContain('<script type="importmap">')
        expect(html).toContain('"react": "https://esm.sh/react@18.2.0"')
        expect(html).toContain('"react-dom": "https://esm.sh/react-dom@18.2.0"')
        expect(html).toContain('</script>')
    })

    test('bundleFiles should support external dependencies through importmap', async () => {
        const filesWithExternalDeps = [
            {
                path: '/index.ts',
                code: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return count;
}

console.log(Counter);`,
            },
        ]

        const dependencies = {
            react: '18.2.0',
        }

        // This should bundle without errors, treating react as external
        const { code, subpathImports } = await bundleFiles(
            filesWithExternalDeps,
            '/index.ts',
            dependencies,
        )

        // The bundled code should reference react, but not include its implementation
        expect(code).toContain('import')
        expect(code).toContain('react')
        // Should not contain useState implementation since it's external
        expect(code).not.toContain('function useState')
    })

    test('buildPreview should handle subpath imports in import maps', async () => {
        const filesWithSubpaths = [
            {
                path: '/index.tsx',
                code: `import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return React.createElement('div', null, 'Hello World');
}

createRoot(document.getElementById('root')).render(React.createElement(App));`,
            },
        ]

        const dependencies = {
            react: '18.2.0',
            'react-dom': '18.2.0',
        }

        const html = await buildPreview(
            filesWithSubpaths,
            '/index.tsx',
            dependencies,
        )

        // Verify that both the main package and subpath are in the import map
        expect(html).toContain('"react": "https://esm.sh/react@18.2.0"')
        expect(html).toContain('"react-dom": "https://esm.sh/react-dom@18.2.0"')
        expect(html).toContain(
            '"react-dom/client": "https://esm.sh/react-dom@18.2.0/client"',
        )
    })

    test('buildPreview should automatically detect dependencies from package.json', async () => {
        const filesWithPackageJson = [
            {
                path: '/index.tsx',
                code: `import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return React.createElement('div', null, 'Hello World');
}

createRoot(document.getElementById('root')).render(React.createElement(App));`,
            },
            {
                path: '/package.json',
                code: `{
  "name": "test-project",
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}`,
            },
        ]

        // Call buildPreview without explicit dependencies
        const html = await buildPreview(filesWithPackageJson, '/index.tsx')

        // Verify that dependencies from package.json are included in the import map
        expect(html).toContain('<script type="importmap">')
        expect(html).toContain('"react": "https://esm.sh/react@18.2.0"')
        expect(html).toContain('"react-dom": "https://esm.sh/react-dom@18.2.0"')
        expect(html).toContain(
            '"react-dom/client": "https://esm.sh/react-dom@18.2.0/client"',
        )
    })

    test('explicitly provided dependencies should override package.json', async () => {
        const filesWithPackageJson = [
            {
                path: '/index.tsx',
                code: `import React from 'react';
import ReactDOM from 'react-dom';

ReactDOM.render(React.createElement('div', null, 'Hello World'), document.getElementById('root'));`,
            },
            {
                path: '/package.json',
                code: `{
  "name": "test-project",
  "dependencies": {
    "react": "17.0.2",
    "react-dom": "17.0.2"
  }
}`,
            },
        ]

        // Provide explicit dependencies that should override package.json
        const explicitDependencies = {
            react: '18.2.0',
            'react-dom': '18.2.0',
        }

        const html = await buildPreview(
            filesWithPackageJson,
            '/index.tsx',
            explicitDependencies,
        )

        // Verify that explicit dependencies are used, not those from package.json
        expect(html).toContain('"react": "https://esm.sh/react@18.2.0"')
        expect(html).toContain('"react-dom": "https://esm.sh/react-dom@18.2.0"')
        expect(html).not.toContain('17.0.2') // Should not include the versions from package.json
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

        // We need to capture the callback to test it
        let resolveCallback: any

        const build = {
            onResolve: (options: any, callback: any) => {
                if (options.namespace === 'in-memory') {
                    resolveCallback = callback
                }
                return mockCallback
            },
            onLoad: () => {},
        }

        // Set up the plugin
        plugin.setup(build)

        // Test that our namespaced resolver was registered and works correctly
        if (resolveCallback) {
            const result = resolveCallback({
                path: './style.css',
                importer: '/index.ts',
            })

            expect(result.path).toBe('/style.css')
            expect(result.namespace).toBe('in-memory')
        }
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
        const { code } = await bundleFiles(virtualFiles)

        // Verify the code contains content from both files
        expect(code).toContain('bar') // The value should be included in the bundled output
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

        const { code } = await bundleFiles(complexFiles)

        // Verify the code contains elements from all three files
        expect(code).toContain('FACTOR') // from constants.ts
        expect(code).toContain('function add') // from math.ts
        expect(code).toContain('Sum is') // from index.ts
    })
})

// New tests for paths without leading forward slashes
describe('Paths without leading forward slashes', () => {
    test('bundleFiles should work with files that have no leading slash', async () => {
        const virtualFiles = [
            {
                path: 'index.ts', // No leading slash
                code: 'console.log("No slash")',
            },
        ]

        const { code } = await bundleFiles(virtualFiles, 'index.ts')
        expect(code).toContain('console.log("No slash")')
    })

    test('buildPreview should work with files that have no leading slash', async () => {
        const virtualFiles = [
            {
                path: 'index.ts', // No leading slash
                code: 'console.log("No slash")',
            },
        ]

        const html = await buildPreview(virtualFiles, 'index.ts')
        expect(html).toContain('console.log("No slash")')
    })

    test('importing between files with no leading slashes should work', async () => {
        const virtualFiles = [
            {
                path: 'index.ts', // No leading slash
                code: 'import { message } from "./util";\nconsole.log(message);',
            },
            {
                path: 'util.ts', // No leading slash
                code: 'export const message = "Imported from util";',
            },
        ]

        const { code } = await bundleFiles(virtualFiles, 'index.ts')
        expect(code).toContain('Imported from util')
    })

    test('mixed paths with and without leading slashes should work', async () => {
        const virtualFiles = [
            {
                path: '/index.ts', // With leading slash
                code: 'import { message } from "./util";\nconsole.log(message);',
            },
            {
                path: 'util.ts', // No leading slash
                code: 'export const message = "Mixed paths";',
            },
        ]

        const { code } = await bundleFiles(virtualFiles)
        expect(code).toContain('Mixed paths')
    })
})
