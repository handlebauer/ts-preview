<h1 align="center">ts-preview</h1>
<p align="center">A browser-based TypeScript/TSX bundler that enables interactive code experiences</p>

<p align="center">An essential building block for creating code editors, sandboxes, and playgrounds</p>

```typescript
// Create and preview TypeScript/React code - all in the browser
const html = await buildPreview([
    {
        path: '/App.tsx',
        code: 'export const App = () => <div>Hello world!</div>',
    },
])
```

## ✨ Features

- **Browser-based bundling** - Works entirely client-side with WebAssembly
- **React/TSX support** - Handles React and JSX/TSX with ease
- **External dependencies** - Import from npm packages via CDN with automatic subpath resolution
- **Package.json auto-detection** - Simple dependency management
- **Virtual file system** - Bundle multi-file projects with proper imports
- **Lightweight** - Built with esbuild-wasm for efficient processing
- **Preview-ready output** - Generate HTML ready to be displayed in iframes or sandboxes
- **CLI tool** - Also available for local development

## 🚀 Web API Usage

ts-preview provides the foundational tools for building interactive coding experiences:

- Web-based code editors
- Interactive documentation
- Coding tutorials and examples
- Coding playgrounds and sandboxes
- Educational platforms

### Installation

```bash
# Add to your project with npm
npm install ts-preview

# Or with Bun
bun add ts-preview
```

### Core Types

```typescript
// The core type for representing virtual files
interface VirtualFile {
    path: string // Path of the file in the virtual filesystem (e.g., '/index.ts')
    code: string // The source code content of the file
}
```

### Basic Usage

```typescript
// Import the library
import { buildPreview } from 'ts-preview'

// Create virtual files to bundle
const virtualFiles = [
    {
        path: '/index.ts',
        code: 'console.log("Hello, world!");',
    },
    {
        path: '/component.tsx',
        code: 'export const App = () => <div>Hello from TSX!</div>',
    },
]

// Generate a complete HTML preview with bundled JS
const htmlPreview = await buildPreview(virtualFiles, '/index.ts')
// => Returns an HTML string you can inject into an iframe or sandbox
```

### React Component Preview

```typescript
import { buildPreview } from 'ts-preview'

const files = [
    {
        path: '/index.tsx',
        code: `
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import { App } from './App';
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    `,
    },
    {
        path: '/App.tsx',
        code: `
      import React, { useState } from 'react';
      
      export function App() {
        const [count, setCount] = useState(0);
        
        return (
          <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h1>Hello from TS Preview!</h1>
            <p>Count: {count}</p>
            <button 
              onClick={() => setCount(count + 1)}
              style={{
                background: 'blue',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Increment
            </button>
          </div>
        );
      }
    `,
    },
]

// External dependencies for the React app
const dependencies = {
    react: '18.2.0',
    'react-dom': '18.2.0',
}

// Generate a preview HTML with the React app and its dependencies
const html = await buildPreview(files, '/index.tsx', dependencies)

// Use the HTML string in your application - for example, in an iframe
document.getElementById('preview-container').innerHTML = `
  <iframe
    title="TypeScript Preview"
    srcDoc="${html.replace(/"/g, '&quot;')}"
    sandbox="allow-scripts"
    width="100%"
    height="100%"
  ></iframe>
`
```

### Automatic Dependency Management

ts-preview provides smart dependency resolution:

#### Option 1: Specify Dependencies Explicitly

```typescript
// Specify the dependencies with their versions
const dependencies = {
    react: '18.2.0',
    'react-dom': '18.2.0',
}

const html = await buildPreview(files, '/index.tsx', dependencies)
```

#### Option 2: Use package.json for Automatic Detection

```typescript
// Include a package.json file in your virtual filesystem
const files = [
    {
        path: '/index.tsx',
        code: '/* your code here */',
    },
    {
        path: '/package.json',
        code: `{
      "name": "my-app",
      "dependencies": {
        "react": "18.2.0",
        "react-dom": "18.2.0",
        "@mui/material": "5.14.5",
        "@emotion/react": "11.11.1",
        "@emotion/styled": "11.11.0"
      }
    }`,
    },
]

// ts-preview will automatically detect and use dependencies from package.json
const html = await buildPreview(files, '/index.tsx')
```

### Advanced Features

#### Automatic Subpath Import Resolution

ts-preview handles subpath imports like `react-dom/client`:

```typescript
// Import includes a subpath: 'react-dom/client'
const code = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  
  function App() {
    return <h1>Hello World</h1>;
  }
  
  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
`

// ts-preview automatically detects and resolves the subpath imports
const html = await buildPreview([{ path: '/index.tsx', code }], '/index.tsx', {
    react: '18.2.0',
    'react-dom': '18.2.0',
})
```

#### JavaScript-Only Output

If you need just the bundled JavaScript without HTML:

```typescript
import { bundleFiles } from 'ts-preview'

const { code } = await bundleFiles(virtualFiles, '/index.tsx', dependencies)
// => Returns just the bundled JavaScript
```

## 🛠️ Browser Compatibility

ts-preview works in modern browsers that support WebAssembly:

- Chrome/Edge (v57+)
- Firefox (v53+)
- Safari (v11+)
- Opera (v44+)

Additionally, ts-preview requires browsers that support **Import Maps** for dependency resolution:

- Chrome/Edge (v89+)
- Firefox (v108+)
- Safari (v16.4+)

## 📦 CLI Usage

While the web API is the primary use case, ts-preview also provides a CLI for local development:

```bash
# Install globally
npm install -g ts-preview

# Generate an HTML preview
ts-preview path/to/your/file.ts

# Or with bunx (no installation required)
bunx ts-preview path/to/your/file.ts
```

## 🧰 Project Structure

- `/src/web` - Browser-based bundling and preview generation
- `/src/cli` - Command-line interface for local development
- `/src/shared` - Shared utilities for both environments

## 📄 License

MIT License
