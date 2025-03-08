import { $ } from 'bun'

// Generate HTML preview (default behavior)
console.log('Generating HTML preview...')
await $`bun run src/cli/index.ts src/cli/demo/example/index.ts -o src/cli/demo/example/preview.html`

// Generate JS-only output
console.log('\nGenerating bundled JavaScript only...')
await $`bun run src/cli/index.ts src/cli/demo/example/index.ts --js-only -o src/cli/demo/example/bundle.js`

console.log('\n✅ Demo completed. Check the following files:')
console.log('  - HTML preview: src/cli/demo/example/preview.html')
console.log('  - JS bundle: src/cli/demo/example/bundle.js')
