import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { buildPreview } from '../../../src/web/index.ts'
import './App.css'

// Add React typings to Monaco
const addExtraLib = monaco => {
    // Add React types
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `
        declare module 'react' {
            export = React;
        }
        
        declare namespace React {
            function createElement(type: any, props?: any, ...children: any[]): any;
            function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
            function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
            // Add more React types as needed
        }
        `,
        'react.d.ts',
    )

    // Add React DOM types
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `
        declare module 'react-dom/client' {
            export function createRoot(container: Element | DocumentFragment): {
                render(element: React.ReactNode): void;
                unmount(): void;
            };
        }
        
        declare module 'react-dom' {
            function render(element: React.ReactNode, container: Element | DocumentFragment): void;
            namespace render {}
        }
        `,
        'react-dom.d.ts',
    )
}

// Default example files
const DEFAULT_FILES = [
    {
        path: '/index.tsx',
        code: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
    },
    {
        path: '/App.tsx',
        code: `import React, { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Hello from TS Preview!</h1>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          background: 'blue',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Increment
      </button>
    </div>
  );
}`,
    },
]

function App() {
    const [files, setFiles] = useState(DEFAULT_FILES)
    const [selectedFile, setSelectedFile] = useState(0)
    const [preview, setPreview] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const dependencies = {
        react: '18.2.0',
        'react-dom': '18.2.0',
    }

    const generatePreview = async () => {
        setIsLoading(true)
        try {
            const html = await buildPreview(files, '/index.tsx', dependencies)
            setPreview(html)
        } catch (error) {
            console.error('Error generating preview:', error)
            setPreview(
                `<html><body><pre>Error: ${error.message}</pre></body></html>`,
            )
        } finally {
            setIsLoading(false)
        }
    }

    const handleCodeChange = value => {
        const updatedFiles = [...files]
        updatedFiles[selectedFile] = {
            ...updatedFiles[selectedFile],
            code: value,
        }
        setFiles(updatedFiles)
    }

    const addNewFile = () => {
        const fileName = prompt(
            'Enter file path (e.g., /components/Button.tsx):',
        )
        if (fileName) {
            const newFiles = [
                ...files,
                {
                    path: fileName,
                    code: '// Start typing your code here',
                },
            ]
            setFiles(newFiles)
            setSelectedFile(newFiles.length - 1)
        }
    }

    return (
        <div className="app-container">
            <div className="sidebar">
                <h2>TypeScript Preview Demo</h2>
                <div className="file-list">
                    <h3>Files</h3>
                    <ul>
                        {files.map((file, index) => (
                            <li
                                key={file.path}
                                className={
                                    selectedFile === index ? 'selected' : ''
                                }
                                onClick={() => setSelectedFile(index)}
                            >
                                {file.path.startsWith('/')
                                    ? file.path.substring(1)
                                    : file.path}
                            </li>
                        ))}
                    </ul>
                    <button className="add-file-btn" onClick={addNewFile}>
                        + Add File
                    </button>
                </div>
                <button
                    className="preview-btn"
                    onClick={generatePreview}
                    disabled={isLoading}
                >
                    Generate Preview
                </button>
            </div>

            <div className="editor-container">
                <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    language={
                        files[selectedFile].path.endsWith('.tsx')
                            ? 'typescript'
                            : 'javascript'
                    }
                    value={files[selectedFile].code}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        padding: { top: 16 },
                    }}
                    beforeMount={monaco => {
                        // Configure TypeScript compiler options for TSX support
                        monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
                            {
                                jsx: monaco.languages.typescript.JsxEmit.React,
                                jsxFactory: 'React.createElement',
                                reactNamespace: 'React',
                                allowNonTsExtensions: true,
                                target: monaco.languages.typescript.ScriptTarget
                                    .Latest,
                                allowJs: true,
                                moduleResolution:
                                    monaco.languages.typescript
                                        .ModuleResolutionKind.NodeJs,
                            },
                        )

                        // Add React typings
                        addExtraLib(monaco)
                    }}
                />
            </div>

            <div className="preview-container">
                <h3>Preview</h3>
                {preview ? (
                    <iframe
                        title="TypeScript Preview"
                        srcDoc={preview}
                        sandbox="allow-scripts"
                        width="100%"
                        height="100%"
                    />
                ) : (
                    <div className="empty-preview">
                        <p>
                            Click "Generate Preview" to see your code in action
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App
