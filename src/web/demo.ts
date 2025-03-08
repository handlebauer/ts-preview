import { buildPreview } from './index'
import type { VirtualFile } from './types'

// Example virtual file system with 3 files having dependencies:
// /index.ts imports from /math.ts, which in turn imports from /constants.ts.
const virtualFiles: VirtualFile[] = [
    {
        path: '/index.ts',
        code: "import { add } from './math';\nconsole.log('Sum is', add(2, 3));",
    },
    {
        path: '/math.ts',
        code: "import { FACTOR } from './constants';\nexport function add(a: number, b: number): number { return (a + b) * FACTOR; }",
    },
    {
        path: '/constants.ts',
        code: 'export const FACTOR = 2;',
    },
]

// Example with React component using external dependencies
const reactExample: VirtualFile[] = [
    {
        path: '/index.tsx',
        code: `
import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div>
      <h1>React Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
`,
    },
]

// External dependencies for React example
const dependencies = {
    react: '18.2.0',
    'react-dom': '18.2.0',
}

// Basic example without external dependencies
await buildPreview(virtualFiles)
    .then((html: string) => {
        console.log('Basic Example:')
        console.log(html)
    })
    .catch((error: Error) => {
        console.error('Error building preview:', error)
    })

// React example with external dependencies
await buildPreview(reactExample, '/index.tsx', dependencies)
    .then((html: string) => {
        console.log('\nReact Example with Dependencies:')
        console.log(html)
    })
    .catch((error: Error) => {
        console.error('Error building preview:', error)
    })
