import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { memoryQueryClient } from './query/memoryClient.js'
import { clearLegacySensitiveStorage } from './api/browserStorage.js'

// Wipe legacy persisted sensitive data before rendering any account UI.
clearLegacySensitiveStorage()
// Unregister any existing service workers from previous PWA setup
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

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
    <QueryClientProvider client={memoryQueryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
