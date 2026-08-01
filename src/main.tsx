import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { markAppHealthy, scheduleUpdateCheck } from './lib/appUpdate.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

/**
 * Boot is deliberately network-free — the app is already on screen by the time
 * anything below runs. `markAppHealthy` confirms the running bundle actually
 * rendered, which is what arms the automatic rollback for future updates.
 */
requestAnimationFrame(() => {
  // Drop the static placeholder only once React has painted over it.
  document.getElementById('boot-fallback')?.remove()
  void markAppHealthy()
  scheduleUpdateCheck()
})
