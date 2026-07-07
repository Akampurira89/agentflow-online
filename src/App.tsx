import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app-container">
      <h1>AgentFlow Online</h1>
      <p>A minimal Vite + React + TypeScript app.</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Count is {count}
      </button>
    </div>
  )
}

export default App
