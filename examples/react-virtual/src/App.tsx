import React, { useState } from 'react'

function App() {
    const [count, setCount] = useState(0)
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-105">
                <div className="p-8 flex flex-col gap-4 items-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Tailwind Demo
                    </h1>
                    <p className="text-gray-600 mb-6">
                        A simple showcase of Tailwind styling.
                    </p>

                    <div className="bg-gray-100 rounded-lg p-4 mb-6">
                        <p className="text-gray-700 text-sm font-medium mb-2">
                            Current Count
                        </p>
                        <div className="text-4xl font-bold text-indigo-600 tracking-tight flex items-center justify-center h-16 bg-indigo-50 rounded-md">
                            {count}
                        </div>
                    </div>
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md flex-1"
                        onClick={() => setCount(count + 1)}
                    >
                        Increment
                    </button>
                </div>
            </div>
        </div>
    )
}

export default App
