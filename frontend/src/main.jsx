import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Haptic feedback on every button/link tap (Android only — iOS ignores vibrate)
document.addEventListener('pointerdown', (e) => {
  if (navigator.vibrate && e.pointerType === 'touch' && e.target.closest('button, a, [role="button"]')) {
    navigator.vibrate(8)
  }
}, { passive: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
