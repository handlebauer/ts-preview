import { $ } from 'bun'

await $`bun run src/cli/index.ts src/cli/demo/example/index.ts -o src/cli/demo/example/preview.html`
