#!/usr/bin/env bun
/**
 * Simple React example with npm-in-browser
 *
 * This example:
 * 1. Installs React to memfs using npm-in-browser
 * 2. Extracts the React production build files directly
 * 3. Creates a simple HTML page using those files
 *
 * Run with: bun run simple-react-example.ts
 */

import memfs from 'memfs'
import { runNpmCli } from 'npm-in-browser'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Directory for output files
const OUTPUT_DIR = './src/experimental/output'

if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
}

// App directory in memfs
const NPM_DIR = '/home/web/app'

// Simple React component
const reactComponent = `
function App() {
  const [count, setCount] = React.useState(0);
  
  return React.createElement(
    'div', 
    { style: { fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' } },
    [
      React.createElement('h1', { style: { color: '#0070f3' } }, 'React with npm-in-browser'),
      React.createElement('p', null, 'Count: ' + count),
      React.createElement(
        'button', 
        { 
          onClick: () => setCount(count + 1),
          style: {
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, 
        'Increment'
      )
    ]
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
`

async function main() {
    console.log('🚀 Starting simple React example with npm-in-browser')

    try {
        // Step 1: Install React and React DOM
        console.log('📦 Installing React packages...')
        console.time('npm-install')

        await runNpmCli(['install', 'react@18.2.0', 'react-dom@18.2.0'], {
            fs: memfs.fs,
            cwd: NPM_DIR,
            stdout: chunk => console.log(`📝 npm stdout: ${chunk}`),
            stderr: chunk => console.error(`❌ npm stderr: ${chunk}`),
        })

        console.timeEnd('npm-install')

        // Step 2: Extract the production React builds directly from node_modules
        console.log('📝 Extracting React production builds...')

        const reactPath = `${NPM_DIR}/node_modules/react/umd/react.production.min.js`
        const reactDomPath = `${NPM_DIR}/node_modules/react-dom/umd/react-dom.production.min.js`

        if (
            !memfs.fs.existsSync(reactPath) ||
            !memfs.fs.existsSync(reactDomPath)
        ) {
            throw new Error(
                'React UMD builds not found. They should be in node_modules after installation.',
            )
        }

        const reactCode = memfs.fs.readFileSync(reactPath, 'utf8')
        const reactDomCode = memfs.fs.readFileSync(reactDomPath, 'utf8')

        console.log('✅ Extracted React UMD builds')

        // Step 3: Create a simple HTML page with the React app
        console.log('🎨 Creating HTML page with React app...')

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React with npm-in-browser</title>
</head>
<body>
  <div id="root"></div>
  
  <!-- React library from memfs -->
  <script>
${reactCode}
  </script>
  
  <!-- ReactDOM library from memfs -->
  <script>
${reactDomCode}
  </script>
  
  <!-- Our React component -->
  <script>
${reactComponent}
  </script>
</body>
</html>`

        // Step 4: Save the HTML to a file
        console.log('💾 Saving output files...')

        writeFileSync(join(OUTPUT_DIR, 'react-app.html'), html)

        console.log('✨ Done! React app saved to:')
        console.log(`- ${join(OUTPUT_DIR, 'react-app.html')}`)
        console.log('\nOpen react-app.html in a browser to see the result!')
    } catch (error) {
        console.error('❌ Error:', error)
        process.exit(1)
    }
}

// Run the main function
main().catch(console.error)
