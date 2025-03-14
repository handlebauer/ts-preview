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
            path: '/App.tsx',
            code: readFileContent(path.join(__dirname, 'src/App.tsx')),
        },
        {
            path: '/main.tsx',
            code: readFileContent(path.join(__dirname, 'src/main.tsx')),
        },
        {
            path: '/package.json',
            code: readFileContent(path.join(__dirname, 'package.json')),
        },
    ]

    // Build the preview HTML
    const html = await buildPreview(virtualFiles, '/main.tsx', {
        tailwind: true,
    })

    // Write the generated HTML to a file
    fs.writeFileSync(path.join(__dirname, 'index.html'), html)
    console.log('Preview built and saved to index.html')
}

// Run the script
main().catch(console.error)
