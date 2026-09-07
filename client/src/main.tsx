import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { initAnalytics } from './lib/analytics'
import './styles/index.css'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
