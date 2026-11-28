import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './velvet'
import './boxStyle'
import './typeStyle'
import App from './App.tsx'
import { Analytics } from '@vercel/analytics/react'
import { labOn } from './velvetLab'

// Velvet preview only: the look lab panel (/?velvet=1&lab=1).
if (labOn) void import('./velvetLabPanel').then((m) => m.mountLookLab())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics: cookie-less page views, countries, referrers. */}
    <Analytics />
  </StrictMode>,
)
