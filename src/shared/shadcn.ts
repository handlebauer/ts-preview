/**
 * TypeScript implementation of shadcn component fetcher
 */

// Types based on the shadcn registry schemas
type RegistryIndexItem = {
    name: string
    type: string
    registryDependencies?: string[]
    files?: string[]
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
}

type RegistryItem = {
    name: string
    type: string
    files: Record<string, any> // Files can contain strings or objects
    registryDependencies?: string[]
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    tailwind?: Record<string, any>
    cssVars?: Record<string, any>
    docs?: string
}

type ImportOptions = {
    style?: 'default' | 'new-york'
    baseColor?: string
    baseDir?: string
}

type ImportResult = {
    success: boolean
    message: string
    files?: Array<{ path: string; code: string }>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
}

type VirtualFile = {
    path: string
    code: string
}

/**
 * Function to fetch and process shadcn components using the same approach as the shadcn CLI
 *
 * @param name - The name of the component to import (e.g., "button", "alert")
 * @param options - Configuration options
 * @returns Promise with the import result
 */
async function importShadcnComponent(
    name: string,
    options: ImportOptions = {},
): Promise<ImportResult> {
    const {
        style = 'default',
        baseColor = 'slate',
        baseDir = './components/ui',
    } = options

    // The registry URL that shadcn uses
    const REGISTRY_URL = 'https://ui.shadcn.com/r'

    // Cache for registry requests to avoid duplicate fetches
    const registryCache = new Map<string, Promise<any>>()

    // Special parser for handling JSON strings containing file data
    function parseFileJson(jsonStr: string): VirtualFile | null {
        try {
            const parsed = JSON.parse(jsonStr)
            if (
                parsed &&
                typeof parsed === 'object' &&
                parsed.path &&
                parsed.content
            ) {
                return {
                    path: parsed.path.startsWith('./')
                        ? parsed.path
                        : `./${parsed.path}`,
                    code: parsed.content,
                }
            }
        } catch (e) {
            console.warn('Failed to parse JSON string:', e)
        }
        return null
    }

    /**
     * Fetch data from the registry
     * @param paths - Array of paths to fetch from the registry
     * @returns Array of fetched data
     */
    async function fetchRegistry(paths: string[]): Promise<any[]> {
        try {
            const results = await Promise.all(
                paths.map(async path => {
                    const url = getRegistryUrl(path)

                    // Check cache first
                    if (registryCache.has(url)) {
                        return registryCache.get(url)
                    }

                    // Store the promise in the cache before awaiting
                    const fetchPromise = (async () => {
                        const response = await fetch(url)

                        if (!response.ok) {
                            const errorMessages: Record<number, string> = {
                                400: 'Bad request',
                                401: 'Unauthorized',
                                403: 'Forbidden',
                                404: 'Not found',
                                500: 'Internal server error',
                            }

                            if (response.status === 404) {
                                throw new Error(
                                    `The component at ${url} was not found. It may not exist in the registry.`,
                                )
                            }

                            const result = await response.json()
                            const message =
                                result &&
                                typeof result === 'object' &&
                                'error' in result
                                    ? result.error
                                    : response.statusText ||
                                      errorMessages[response.status]
                            throw new Error(
                                `Failed to fetch from ${url}. ${message}`,
                            )
                        }

                        return response.json()
                    })()

                    registryCache.set(url, fetchPromise)
                    return fetchPromise
                }),
            )

            return results
        } catch (error) {
            console.error('Error fetching from registry:', error)
            return []
        }
    }

    /**
     * Get the full URL for a registry path
     * @param path - The path to get the URL for
     * @returns The full URL
     */
    function getRegistryUrl(path: string): string {
        if (isUrl(path)) {
            const url = new URL(path)
            if (
                url.pathname.match(/\/chat\/b\//) &&
                !url.pathname.endsWith('/json')
            ) {
                url.pathname = `${url.pathname}/json`
            }
            return url.toString()
        }

        return `${REGISTRY_URL}/${path}`
    }

    /**
     * Check if a string is a valid URL
     * @param path - The string to check
     * @returns Whether the string is a URL
     */
    function isUrl(path: string): boolean {
        try {
            new URL(path)
            return true
        } catch (error) {
            return false
        }
    }

    /**
     * Get the registry index
     * @returns The registry index
     */
    async function getRegistryIndex(): Promise<RegistryIndexItem[] | null> {
        try {
            const [result] = await fetchRegistry(['index.json'])
            return result
        } catch (error) {
            console.error('Error getting registry index:', error)
            return null
        }
    }

    /**
     * Get a specific item from the registry
     * @param name - The name of the item
     * @param style - The style to use
     * @returns The registry item
     */
    async function getRegistryItem(
        itemName: string,
        itemStyle: string,
    ): Promise<RegistryItem | null> {
        try {
            const [result] = await fetchRegistry([
                isUrl(itemName)
                    ? itemName
                    : `styles/${itemStyle}/${itemName}.json`,
            ])

            return result
        } catch (error) {
            console.error('Error getting registry item:', error)
            return null
        }
    }

    /**
     * Resolve the dependencies tree for a component
     * @param index - The registry index
     * @param names - The names of components to resolve
     * @returns The resolved dependency tree
     */
    async function resolveTree(
        index: RegistryIndexItem[],
        names: string[],
    ): Promise<RegistryIndexItem[]> {
        const tree: RegistryIndexItem[] = []

        for (const itemName of names) {
            const entry = index.find(entry => entry.name === itemName)

            if (!entry) {
                continue
            }

            tree.push(entry)

            if (entry.registryDependencies) {
                const dependencies = await resolveTree(
                    index,
                    entry.registryDependencies,
                )
                tree.push(...dependencies)
            }
        }

        // Remove duplicates
        return tree.filter(
            (component, index, self) =>
                self.findIndex(c => c.name === component.name) === index,
        )
    }

    /**
     * Resolve registry dependencies for a component
     * @param itemName - The name of the component
     * @returns The resolved dependency URLs
     */
    async function resolveRegistryDependencies(
        itemName: string,
    ): Promise<string[]> {
        const visited = new Set<string>()
        const payload: string[] = []

        async function resolveDependencies(depName: string): Promise<void> {
            const url = getRegistryUrl(
                isUrl(depName) ? depName : `styles/${style}/${depName}.json`,
            )

            if (visited.has(url)) {
                return
            }

            visited.add(url)

            try {
                const [result] = await fetchRegistry([url])
                payload.push(url)

                if (result.registryDependencies) {
                    for (const dependency of result.registryDependencies) {
                        await resolveDependencies(dependency)
                    }
                }
            } catch (error) {
                console.error(
                    `Error resolving dependency for ${depName}:`,
                    error,
                )
            }
        }

        await resolveDependencies(itemName)
        return Array.from(new Set(payload))
    }

    /**
     * Resolve all registry items for a list of component names
     * @param names - The names of components to resolve
     * @returns The resolved registry items
     */
    async function resolveRegistryItems(names: string[]): Promise<string[]> {
        let registryDependencies: string[] = []
        for (const itemName of names) {
            const itemRegistryDependencies =
                await resolveRegistryDependencies(itemName)
            registryDependencies.push(...itemRegistryDependencies)
        }

        return Array.from(new Set(registryDependencies))
    }

    try {
        console.log(`Importing component: ${name} with style: ${style}`)

        // 1. Get registry index
        const index = await getRegistryIndex()
        if (!index) {
            console.error('Failed to fetch registry index')
            return {
                success: false,
                message: 'Failed to fetch registry index',
            }
        }
        console.log(
            `Registry index fetched: ${index.length} components available`,
        )

        // 2. Resolve registry items
        console.log(`Resolving dependencies for ${name}...`)
        const registryItems = await resolveRegistryItems([name])
        if (!registryItems.length) {
            console.error(`No registry items found for ${name}`)
            return {
                success: false,
                message: `Component "${name}" and its dependencies could not be resolved`,
            }
        }
        console.log(
            `Resolved ${registryItems.length} registry items for ${name}`,
        )

        // 3. Fetch all registry items
        console.log(`Fetching component data...`)
        const result = await fetchRegistry(registryItems)
        if (!result.length) {
            console.error('Failed to fetch component data')
            return {
                success: false,
                message: 'Failed to fetch component data',
            }
        }
        console.log(`Fetched ${result.length} components`)

        // Log the structure of the first result to help with debugging
        if (result[0]) {
            console.log(
                `Component structure example:`,
                Object.keys(result[0])
                    .map(key => `${key}: ${typeof result[0][key]}`)
                    .join(', '),
            )

            if (result[0].files) {
                console.log(
                    `Files structure:`,
                    Object.entries(result[0].files)
                        .slice(0, 2)
                        .map(([path, content]) => `${path}: ${typeof content}`)
                        .join(', ') +
                        (Object.keys(result[0].files).length > 2 ? '...' : ''),
                )
            }
        }

        // 4. Process files from all components
        const virtualFiles: VirtualFile[] = []
        const allDependencies: Record<string, string> = {}
        const allDevDependencies: Record<string, string> = {}

        result.forEach(item => {
            // Merge dependencies
            if (item.dependencies) {
                Object.entries(item.dependencies).forEach(
                    ([depName, version]) => {
                        allDependencies[depName] = version as string
                    },
                )
            }

            // Merge devDependencies
            if (item.devDependencies) {
                Object.entries(item.devDependencies).forEach(
                    ([depName, version]) => {
                        allDevDependencies[depName] = version as string
                    },
                )
            }

            // Process files
            if (item.files) {
                // Log information about the files to help debugging
                console.log(
                    `Processing ${Object.keys(item.files).length} files for component ${item.name}`,
                )

                Object.entries(item.files).forEach(([filePath, content]) => {
                    try {
                        // Skip if content is null or undefined
                        if (content === null || content === undefined) {
                            console.warn(
                                `Skipping file with null/undefined content: ${filePath}`,
                            )
                            return
                        }

                        // Check if content is a JSON string containing a file object
                        if (
                            typeof content === 'string' &&
                            content.trim().startsWith('{') &&
                            content.includes('"path"') &&
                            content.includes('"content"')
                        ) {
                            const fileObj = parseFileJson(content)
                            if (fileObj) {
                                virtualFiles.push(fileObj)
                                return
                            }
                        }

                        // Normalize the path
                        const processedPath = filePath
                            .replace(/^@\/components\/ui\//, `./ui/`)
                            .replace(/^@\//, './')

                        // Convert content to string if it's not already
                        let processedContent: string
                        if (typeof content === 'string') {
                            processedContent = content
                        } else if (typeof content === 'object') {
                            // If the object has path and content, treat it as a file object
                            if (
                                content &&
                                'path' in content &&
                                'content' in content
                            ) {
                                const typedContent = content as {
                                    path: string
                                    content: unknown
                                }
                                virtualFiles.push({
                                    path: typedContent.path.startsWith('./')
                                        ? typedContent.path
                                        : `./${typedContent.path}`,
                                    code:
                                        typeof typedContent.content === 'string'
                                            ? typedContent.content
                                            : JSON.stringify(
                                                  typedContent.content,
                                              ),
                                })
                                return
                            }
                            // Otherwise stringify it
                            processedContent = JSON.stringify(content, null, 2)
                            console.warn(
                                `Converted object to JSON string for file: ${filePath}`,
                            )
                        } else {
                            // Force to string for any other type
                            processedContent = String(content)
                            console.warn(
                                `Converted ${typeof content} to string for file: ${filePath}`,
                            )
                        }

                        // Process imports in content
                        processedContent = processedContent.replace(
                            /@\/components\/ui\//g,
                            `@/ui/`,
                        )

                        // Add to virtual files array
                        virtualFiles.push({
                            path: processedPath,
                            code: processedContent,
                        })
                    } catch (error) {
                        console.error(
                            `Error processing file ${filePath}:`,
                            error,
                        )
                    }
                })
            }
        })

        // 5. Return the result
        return {
            success: true,
            message: `Successfully imported ${name} component and its dependencies`,
            files: virtualFiles,
            dependencies: allDependencies,
            devDependencies: allDevDependencies,
        }
    } catch (error: any) {
        return {
            success: false,
            message: `Failed to import component: ${error.message}`,
        }
    }
}

// Example Node.js usage
async function installComponent(
    name: string,
    options: ImportOptions = {},
): Promise<any> {
    /**
     * Example of Node.js implementation - requires fs and path modules
     *
     * const fs = require('fs').promises;
     * const path = require('path');
     */

    const result = await importShadcnComponent(name, options)

    if (result.success && result.files) {
        // Write files to disk
        for (const file of result.files) {
            /* Node.js implementation would look like:
        const fullPath = path.resolve(file.path);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, file.code);
        */

            console.log(`Would write to: ${file.path}`)
        }

        console.log(`Installed ${name} component and dependencies`)

        // Return information about what was installed
        return {
            success: true,
            componentName: name,
            files: result.files.map(f => f.path),
            dependencies: result.dependencies,
            devDependencies: result.devDependencies,
        }
    } else {
        console.error(result.message)
        return {
            success: false,
            message: result.message,
        }
    }
}

// Browser usage example
async function fetchComponent(
    name = 'button',
    options: ImportOptions = {},
): Promise<ImportResult> {
    const result = await importShadcnComponent(name, options)
    console.log(result.message)

    if (result.success && result.files) {
        console.log(`Found ${result.files.length} files`)
        // In a browser environment, you might use the File System Access API
        // to write these files to disk if the user has granted permission
    }

    return result
}

export { importShadcnComponent, installComponent, fetchComponent }
export type {
    ImportOptions,
    ImportResult,
    RegistryItem,
    RegistryIndexItem,
    VirtualFile,
}
