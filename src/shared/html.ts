import { indentCode } from './utils'

/**
 * Generate a preview HTML document with the provided JavaScript code
 * @param jsCode The bundled JavaScript code to include in the preview
 * @param title The title of the preview HTML page
 * @param importMap Optional import map for external dependencies
 * @param includeTailwind Whether to include Tailwind CSS
 * @returns A formatted HTML string
 */
export function generatePreviewHtml(
    jsCode: string,
    title: string = 'TSX Preview',
    importMap?: Record<string, string>,
    includeTailwind?: boolean,
): string {
    let importMapScript = ''

    if (importMap) {
        importMapScript = `<script type="importmap">
${indentCode(JSON.stringify({ imports: importMap }, null, 2), 2)}
</script>`
    }

    const tailwindScript = includeTailwind
        ? '<script src="https://cdn.tailwindcss.com"></script>'
        : ''

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${importMapScript}
  ${tailwindScript}
</head>
<body>
  <div id="root"></div>
  <script type="module">
${indentCode(jsCode, 4)}
  </script>
</body>
</html>`.trim()
}
