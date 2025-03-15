import * as fs from 'fs'
import * as path from 'path'
import { buildPreview } from '../../src/web/index'

// Define our VirtualFile type based on what we've seen in the tests
type VirtualFile = {
    path: string
    code: string
}

// Simple function to read the content of a file
function readFileContent(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8')
}

// Main function to build our virtual file system
async function main() {
    // Define our virtual files
    const virtualFiles: VirtualFile[] = [
        {
            path: 'src/App.tsx',
            code: readFileContent(path.join(__dirname, 'src/App.tsx')),
        },
        {
            path: 'src/main.tsx',
            code: readFileContent(path.join(__dirname, 'src/main.tsx')),
        },
        {
            path: 'package.json',
            code: readFileContent(path.join(__dirname, 'package.json')),
        },
    ]

    // Build the preview HTML with specific React dependency versions
    // Override to React 18 which is more compatible with Radix UI
    const html = await buildPreview(virtualFiles, 'src/main.tsx', {
        tailwind: true,
        dependencies: {
            react: '19.0.0',
            'react-dom': '19.0.0',
            'class-variance-authority': '0.7.0',
            clsx: '2.0.0',
            'tailwind-merge': '2.0.0',
            '@radix-ui/react-slot': '1.1.0',
            '@radix-ui/react-alert-dialog': '1.1.6',
        },
    })

    // Write the generated HTML to a file
    fs.writeFileSync(path.join(__dirname, 'index.html'), html)
    console.log('Preview built and saved to index.html')
}

// Run the script
main().catch(console.error)
