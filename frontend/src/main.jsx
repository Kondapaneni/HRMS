import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the PWA service worker explicitly
registerSW({ immediate: true })

// Force IST timezone for all Date formatting
const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (locales, options) {
  return originalToLocaleString.call(this, locales, { timeZone: 'Asia/Kolkata', ...(options || {}) });
};

const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (locales, options) {
  return originalToLocaleDateString.call(this, locales, { timeZone: 'Asia/Kolkata', ...(options || {}) });
};

const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function (locales, options) {
  return originalToLocaleTimeString.call(this, locales, { timeZone: 'Asia/Kolkata', ...(options || {}) });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
