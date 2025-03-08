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

await buildPreview(virtualFiles)
    .then((html: string) => {
        console.log(html)
    })
    .catch((error: Error) => {
        console.error('Error building preview:', error)
    })
