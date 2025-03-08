<h1 align="center">ts-preview</h1>
<p align="center">A lightweight utility to generate browser-previewable HTML files from TypeScript/TSX projects</p>

<pre align="center">bunx <b>ts-preview</b> path/to/file.ts</pre>

<p align="center">or generate JavaScript only without HTML wrapper</p>

<pre align="center">bunx ts-preview <b>--js-only</b> -o bundle.js</pre>

## ✨ Features

- **CLI tool** for local development
- **Browser-based bundling** for web applications
- **External dependencies support** with automatic subpath import resolution
- **Package.json auto-detection** for seamless dependency management
- **JS-only output** option for more flexibility
- **Automatic entry point detection** from package.json
- **In-memory file system** for browser-based bundling
- **Built with Bun** for fast and efficient operation

## 📦 Installation

### Global Installation

```bash
# Install globally with Bun
bun install -g ts-preview

# Or with npm
npm install -g ts-preview
```

### Project Installation

```bash
# Add to your project with Bun
bun add ts-preview

# Or with npm
npm install ts-preview
```

## 🚀 Usage

### CLI

Once installed globally, you can use the CLI directly:

<p align="center">
<b>Generate HTML preview (default)</b>
</p>

```bash
# Use default entry point (src/index.ts)
ts-preview

# Specify custom entry point
ts-preview path/to/your/file.ts

# Specify output file
ts-preview -o custom-preview.html
```

<p align="center">
<b>Generate JavaScript only</b>
</p>

```bash
# Output only bundled JavaScript (no HTML wrapper)
ts-preview --js-only -o bundle.js
```

You can also use it with bunx without installation:

```bash
bunx ts-preview path/to/your/file.ts
```

### Web API

The ts-preview package provides a browser-compatible API for bundling and previewing TypeScript files directly in web applications.

#### Types

```typescript
// The core type for representing virtual files
interface VirtualFile {
    path: string // Path of the file in the virtual filesystem (e.g., '/index.ts')
    code: string // The source code content of the file
}
```

#### Core Functions

<p align="center">
<b>Basic Usage</b>
</p>

```typescript
// Import the library
import { buildPreview, bundleFiles } from 'ts-preview'

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
// => Returns an HTML string with your bundled code embedded

// Or just bundle the files without HTML wrapping
const bundledCode = await bundleFiles(virtualFiles, '/index.ts')
// => Returns just the bundled JavaScript
```

<p align="center">
<b>React Component Preview</b>
</p>

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
      import React from 'react';
      
      export function App() {
        return <h1>Hello from React!</h1>;
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

// Use the HTML string in your application
document.getElementById('preview-container').innerHTML = html
```

<p align="center">
<b>Handling External Dependencies</b>
</p>

```typescript
import { buildPreview } from 'ts-preview'

// Example code using external libraries
const files = [
    {
        path: '/index.tsx',
        code: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      
      function Counter() {
        const [count, setCount] = useState(0);
        
        return (
          <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
          </div>
        );
      }
      
      const root = createRoot(document.getElementById('root'));
      root.render(<Counter />);
    `,
    },
]

// Specify the dependencies with their versions
const dependencies = {
    react: '18.2.0',
    'react-dom': '18.2.0',
}

// Generate preview with external dependencies properly mapped
const html = await buildPreview(files, '/index.tsx', dependencies)

// ts-preview automatically handles subpath imports like 'react-dom/client'
```

<p align="center">
<b>Using package.json for Dependencies (Automatic Detection)</b>
</p>

```typescript
import { buildPreview } from 'ts-preview'

// Include a package.json file in your virtual filesystem
const files = [
    {
        path: '/index.tsx',
        code: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { Button } from '@mui/material';
      
      function App() {
        const [count, setCount] = React.useState(0);
        
        return (
          <div>
            <h1>Material UI Example</h1>
            <p>Count: {count}</p>
            <Button variant="contained" onClick={() => setCount(count + 1)}>
              Increment
            </Button>
          </div>
        );
      }
      
      const root = createRoot(document.getElementById('root'));
      root.render(<App />);
    `,
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

// No need to manually specify dependencies!
```

#### Automatic Dependency Detection

When working with ts-preview in a browser context, you can take advantage of automatic dependency detection:

1. **Include package.json** - Simply include a package.json file in your virtual filesystem
2. **No explicit dependencies required** - Dependencies will be automatically extracted from package.json
3. **Priority system** - Explicitly provided dependencies will override those in package.json
4. **Full subpath support** - Works with all the same subpath import features

This is particularly useful when:

- Building browser-based IDEs or playgrounds
- Working with complete projects that already have package.json
- Supporting user projects with complex dependency structures

#### Automatic Subpath Import Resolution

When external dependencies are provided, ts-preview automatically:

1. Detects all subpath imports (e.g., `react-dom/client`)
2. Creates the necessary import map entries for each subpath
3. Configures the preview to load the dependencies from a CDN (esm.sh)

This enables seamless usage of libraries with subpath exports like React 18's client API without any additional configuration.

#### Browser Compatibility

The web API uses esbuild-wasm under the hood, which runs entirely in the browser. This allows you to bundle TypeScript/TSX code directly in web applications without requiring a server roundtrip.

- Compatible with modern browsers that support WebAssembly
- No need for a Node.js backend or build server
- Efficient in-memory virtual file system for code management

## 🧩 Project Structure

- `/src/cli` - Command-line interface for local development
- `/src/web` - Browser-based bundling and preview generation
- `/src/shared` - Shared utilities for both CLI and web

## 🛠️ Development

```bash
# Install dependencies
bun install

# Run the CLI during development
bun run src/cli/index.ts

# Run demo (generates both HTML preview and JS-only output)
bun run src/cli/demo

# Build the package (includes bundling and TypeScript declarations)
bun run build

# Run tests
bun test
```

## 📢 Publishing

After building with `bun run build`, you can publish the package:

```bash
# Publish from project root
npm publish

# Or with bun
bun publish
```

## 📄 License

MIT License
