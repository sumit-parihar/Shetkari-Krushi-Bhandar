import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
            background: '#fdfaf5',
            color: '#2c1810',
            border: '1px solid #e5cfb0',
            boxShadow: '0 4px 24px rgba(180,120,60,0.15)',
          },
          success: {
            iconTheme: { primary: '#4a9635', secondary: '#fdfaf5' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fdfaf5' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
