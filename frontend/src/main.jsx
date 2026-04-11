import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {
  attachOfflineSyncListeners,
  getQueueSummary,
  processSyncQueue,
} from './services/offlineSync'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      return;
    }

    // In dev, always remove old SW/cache so refresh shows latest UI.
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  });
}
attachOfflineSyncListeners()
processSyncQueue().catch(() => {})
getQueueSummary().then((summary) => {
  if (summary.queued > 0) {
    console.log(`Offline queue pending: ${summary.queued}`);
  }
}).catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
