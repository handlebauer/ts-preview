import memfs from 'memfs'
import { runNpmCli } from 'npm-in-browser'
import { buildPreview, type VirtualFile } from './index'

/**
 * Simple test that demonstrates installing packages with npm-in-browser
 */
async function testNpmInBrowser() {
    console.log('Installing React and React DOM with npm-in-browser...')
    console.time('npm-install')

    try {
        // Install React and React DOM using npm-in-browser
        await runNpmCli(['install', 'react', 'react-dom'], {
            // Use memfs for the virtual filesystem
            fs: memfs.fs,
            cwd: '/home/web/app',
            stdout: chunk => {
                console.log('stdout:', chunk)
            },
            stderr: chunk => {
                console.log('stderr:', chunk)
            },
            timings: {
                start(name) {
                    console.log('START: ' + name)
                },
                end(name) {
                    console.log('END: ' + name)
                },
            },
        })

        console.timeEnd('npm-install')

        // Verify installation by reading React's package.json
        const packageJson = memfs.fs.readFileSync(
            '/home/web/app/node_modules/react/package.json',
            'utf8',
        )
        console.log('React package.json:', packageJson)

        // Create a simple React component
        const reactComponent = `
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Hello from npm-in-browser!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

// Mount the app to the DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`

        // Create virtual files for bundling
        const virtualFiles: VirtualFile[] = [
            {
                path: '/index.tsx',
                code: reactComponent,
            },
        ]

        console.log('Building preview...')
        console.time('build-preview')

        // Use our buildPreview function to create a complete HTML preview
        // This will use the React packages already installed in memfs
        const preview = await buildPreview(virtualFiles, '/index.tsx', {
            dependencies: {
                react: '18.2.0',
                'react-dom': '18.2.0',
            },
            title: 'React from npm-in-browser',
        })

        console.timeEnd('build-preview')
        console.log('Preview generated successfully!')

        // In a real browser environment, you could display this HTML
        // For example:
        // document.getElementById('preview-container').innerHTML = preview;

        return preview
    } catch (error) {
        console.error('Error in npm-in-browser test:', error)
        throw error
    }
}

// Run the test if we're in a browser environment
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const status = document.createElement('div')
        status.textContent = 'Running npm-in-browser test...'
        document.body.appendChild(status)

        testNpmInBrowser()
            .then(preview => {
                console.log('Test completed successfully!')

                // Create an iframe to display the preview
                const iframe = document.createElement('iframe')
                iframe.style.width = '100%'
                iframe.style.height = '500px'
                iframe.style.border = 'none'
                iframe.srcdoc = preview

                status.textContent = 'Test completed successfully!'
                document.body.appendChild(iframe)
            })
            .catch(error => {
                console.error('Test failed:', error)
                status.textContent = `Test failed: ${error.message}`
                status.style.color = 'red'
            })
    })
}

export { testNpmInBrowser }
