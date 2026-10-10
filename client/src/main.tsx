import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { startAnalytics } from './lib/analytics'
import './styles/index.css'

// Looks up the visitor's region first; GA only starts where allowed.
void startAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
