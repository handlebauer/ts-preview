#!/usr/bin/env bun
import { mkdir } from 'fs/promises'
import { $ } from 'bun'

async function main() {
    // Create dist directory if it doesn't exist
    await mkdir('dist', { recursive: true })

    console.log('🔨 Building tsx-preview...')

    // Build CLI
    console.log('📦 Building CLI...')
    const cliBuild = await Bun.build({
        entrypoints: ['./src/cli/bin.ts'],
        outdir: './dist',
        target: 'bun',
        format: 'esm',
        splitting: false,
        naming: {
            entry: 'cli.js',
        },
        minify: true,
        sourcemap: 'external',
    })

    if (!cliBuild.success) {
        console.error('❌ CLI build failed:')
        for (const log of cliBuild.logs) {
            console.error(log)
        }
        process.exit(1)
    }

    // Build web library
    console.log('📦 Building web library...')
    const webBuild = await Bun.build({
        entrypoints: ['./src/web/index.ts'],
        outdir: './dist',
        target: 'browser',
        format: 'esm',
        external: [
            ...Object.keys(
                JSON.parse(await Bun.file('package.json').text()).dependencies,
            ),
        ],
        splitting: true,
        minify: false, // Don't minify for better debugging experience
        sourcemap: 'external',
    })

    if (!webBuild.success) {
        console.error('❌ Web library build failed:')
        for (const log of webBuild.logs) {
            console.error(log)
        }
        process.exit(1)
    }

    // Generate TypeScript declaration files
    console.log('📝 Generating TypeScript declarations...')

    try {
        const { stdout, stderr } =
            await $`bunx tsc --emitDeclarationOnly --declaration --project tsconfig.types.json --outDir ./dist`

        if (stderr.toString().length) {
            console.error('Type generation errors:', stderr.toString())
        } else {
            console.log('Types generated:', stdout.toString())
        }
    } catch (err) {
        console.error('❌ Type generation failed:', err)
        // Continue with the build even if type generation fails
    }

    console.log('✅ Build completed successfully!')
    console.log('📦 Output in ./dist')
}

main().catch(err => {
    console.error('❌ Build failed:', err)
    process.exit(1)
})
