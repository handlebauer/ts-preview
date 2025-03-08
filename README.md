# tsx-preview

A lightweight utility to generate browser-previewable HTML files from TypeScript/TSX projects using Bun.

## Overview

tsx-preview is a tool that allows you to:

- Bundle TypeScript/TSX code into browser-compatible JavaScript
- Generate standalone HTML preview files with your bundled code
- Preview TypeScript applications directly in any browser without complex setup

## Features

- CLI tool for local development
- Browser-based preview generation
- Automatic entry point detection
- In-memory file system for browser-based bundling
- ESBuild integration for fast and efficient bundling

## Installation

To install dependencies:

```bash
bun install
```

## Usage

### CLI

```bash
# Use default entry point (src/index.ts)
bun run src/cli/index.ts

# Specify custom entry point
bun run src/cli/index.ts path/to/your/file.ts

# Specify output file
bun run src/cli/index.ts -o custom-preview.html
```

### Web API

You can also use tsx-preview in browser environments:

```typescript
import { buildPreview } from 'tsx-preview'

const virtualFiles = [
    { path: '/index.ts', code: 'console.log("Hello, world!");' },
]

const htmlPreview = await buildPreview(virtualFiles)
// Use htmlPreview in your application
```

## Project Structure

- `/src/cli` - Command-line interface for local development
- `/src/web` - Browser-based bundling and preview generation
- `/src/shared` - Shared utilities for both CLI and web

## Development

```bash
# Run the CLI
bun run src/cli/index.ts

# Run tests
bun test
```
