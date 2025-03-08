import { $ } from 'bun'

// Run the CLI with the --js-only flag
await $`bun run src/cli/index.ts src/cli/demo/example/index.ts --js-only -o src/cli/demo/example/bundle.js`
