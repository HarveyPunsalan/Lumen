import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app.js'
import { DebugBoundary, installDebugBanner } from './debug-banner.js'
import './index.css'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root element is missing from index.html')
}

// Temporary [DEBUG-frame] instrumentation for the black-screen bug.
installDebugBanner()

createRoot(container).render(
  <StrictMode>
    <DebugBoundary>
      <App />
    </DebugBoundary>
  </StrictMode>,
)
