import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './velvet'
import App from './App.tsx'
import { Analytics } from '@vercel/analytics/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics: cookie-less page views, countries, referrers. */}
    <Analytics />
  </StrictMode>,
)
