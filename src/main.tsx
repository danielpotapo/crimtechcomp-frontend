import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// temporarily removed strictmode to show display without double load
ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode> 
    <App />
//  </React.StrictMode>,
)
