# TS Preview React Demo

This example demonstrates how to use `ts-preview` in a React application to provide a live TypeScript/TSX preview functionality.

## Features

- Monaco editor for writing TypeScript/TSX code
- Virtual file system for managing multiple files
- Live preview of the code using ts-preview
- Support for React components

## Getting Started

### Prerequisites

- Node.js 16+ or Bun runtime
- npm or bun package manager

### Running the Example

1. First, build the main `ts-preview` package (from the root directory):

```bash
# From the root directory of the ts-preview project
bun run build
```

2. Install dependencies for the example:

```bash
# Navigate to the example directory
cd examples/react-vite

# Install dependencies using npm
npm install
# or using bun
bun install
```

3. Run the development server:

```bash
# Using npm
npm run dev
# or using bun
bun run dev
```

4. Open your browser and navigate to http://localhost:5173

## How It Works

This demo showcases how to use the `buildPreview` function from `ts-preview` to generate HTML previews of TypeScript/TSX code:

1. The app maintains a virtual file system as an array of file objects
2. Each file object has a `path` and `code` property
3. When you click "Generate Preview", the app calls `buildPreview` with the virtual files
4. The generated HTML is rendered in an iframe

## Modifying the Demo

- Add more files to experiment with different TypeScript/TSX components
- Change the dependencies object to use different versions of React
- Modify the default code to experiment with different React patterns

## Learn More

For more information on using `ts-preview`, check out the [main project README](../../README.md).
