#!/usr/bin/env bun

import { Command } from 'commander'
import { resolve } from 'path'
import { generatePreviewHtml, fileExists } from '../shared'
import { bundleTypeScript } from './bundler'

const program = new Command()

// Configure the CLI
program
    .name('tsx-preview')
    .description(
        'Generate a browser-previewable HTML file from a TypeScript project using tsx',
    )
    .argument(
        '[entrypoint]',
        'Path to the TypeScript entrypoint file',
        'src/index.ts',
    )
    .option('-o, --output <path>', 'Output HTML file path', 'preview.html')
    .action(async (entrypointArg, options) => {
        // Step 1: Determine the entrypoint
        let entrypoint = entrypointArg
        const packageJsonPath = resolve('package.json')

        try {
            // Read and parse package.json using Bun's native JSON support
            const packageJson = await Bun.file(packageJsonPath).json()

            // Auto-detect entrypoint if not provided or if the default doesn't exist
            if (!entrypointArg || !(await fileExists(resolve(entrypointArg)))) {
                entrypoint =
                    packageJson.module || packageJson.main || 'src/index.ts'
                console.log(
                    `Entrypoint not specified or found; detected: ${entrypoint}`,
                )
            }

            // Step 2: Get the absolute path to the entrypoint
            const entrypointPath = resolve(entrypoint)
            console.log(`Using entrypoint: ${entrypointPath}`)

            // Step 3: Bundle the TypeScript code
            console.log(`Bundling ${entrypointPath}...`)
            const bundledCode = await bundleTypeScript(entrypointPath)

            // Step 4: Generate the HTML content
            const html = generatePreviewHtml(bundledCode)

            // Step 5: Write the HTML file
            const outputPath = resolve(options.output)
            await Bun.write(outputPath, html)
            console.log(`Generated preview at ${outputPath}`)
            console.log(
                `Open ${outputPath} in your browser to run your project!`,
            )
        } catch (error: unknown) {
            console.error(
                'Error generating preview:',
                error instanceof Error ? error.message : String(error),
            )
            process.exit(1)
        }
    })

// Parse the command-line arguments
program.parse(process.argv)
