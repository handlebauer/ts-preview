#!/usr/bin/env bun

import { Command } from 'commander'
import { resolve, relative } from 'path'
import { generatePreviewHtml, fileExists } from '../shared'
import { bundleTypeScript } from './bundler'
import figures from 'figures'
import yoctoSpinner from 'yocto-spinner'

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
    .option(
        '--js-only',
        'Output only bundled JavaScript without HTML wrapper',
        false,
    )
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
                    `${figures.info} Entrypoint not specified or found; detected: ${entrypoint}`,
                )
            }

            // Get current working directory for relative paths
            const cwd = process.cwd()

            // Step 2: Get the absolute path to the entrypoint
            const entrypointPath = resolve(entrypoint)
            const relativeEntrypointPath = relative(cwd, entrypointPath)
            console.log(`${figures.pointerSmall} ${relativeEntrypointPath}`)

            // Create a spinner for progress indication
            const spinner = yoctoSpinner({
                text: `${figures.arrowRight} Bundling TypeScript...`,
            }).start()

            try {
                // Step 3: Bundle the TypeScript code
                const bundledCode = await bundleTypeScript(entrypointPath)

                // Set default output extension based on output type
                let outputPath = resolve(options.output)

                // Step 4: Generate output content based on --js-only flag
                if (options.jsOnly) {
                    // Skip HTML generation if --js-only flag is set
                    spinner.text = `${figures.arrowRight} Writing bundled JavaScript...`

                    // Change extension to .js if the output still has .html extension
                    if (outputPath.endsWith('.html')) {
                        outputPath = outputPath.replace(/\.html$/, '.js')
                    }

                    // Write just the bundled JavaScript
                    await Bun.write(outputPath, bundledCode)
                } else {
                    // Generate HTML and write to file as before
                    spinner.text = `${figures.arrowRight} Generating HTML preview...`
                    const html = generatePreviewHtml(bundledCode)

                    spinner.text = `${figures.arrowRight} Writing output file...`
                    await Bun.write(outputPath, html)
                }

                // Complete all operations
                spinner.success(`${outputPath}`)
            } catch (err) {
                spinner.error(`Operation failed`)
                throw err
            }
        } catch (error: unknown) {
            console.error(
                `${figures.cross} Error generating preview:`,
                error instanceof Error ? error.message : String(error),
            )
            process.exit(1)
        }
    })

// Parse the command-line arguments
program.parse(process.argv)
