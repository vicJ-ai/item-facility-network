import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AccessProvider } from './auth/AccessContext.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><AccessProvider><App /></AccessProvider></AppErrorBoundary>
  </StrictMode>,
)
