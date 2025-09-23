import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          Solana Todo App
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-center">
            🚀 Your Solana Todo App is ready!
          </p>
          <p className="text-gray-500 text-center mt-2">
            Connected to Program ID: {import.meta.env.VITE_PROGRAM_ID}
          </p>
        </div>
      </div>
    </div>
  )
}

export default App