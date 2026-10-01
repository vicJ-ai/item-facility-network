import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AccessProvider } from './auth/AccessContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessProvider><App /></AccessProvider>
  </StrictMode>,
)
