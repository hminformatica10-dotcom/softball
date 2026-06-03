/// <reference types="vite-plugin-pwa/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onNeedRefresh() { },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Global JS error handlers to help debugging in WebView / logcat
window.addEventListener('error', (event: ErrorEvent) => {
  try {
    console.error('[APP-ERROR] Uncaught error:', event.message, event.error?.stack || event.filename + ':' + event.lineno);
  } catch {
    // ignore
  }
});
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  try {
    console.error('[APP-ERROR] Unhandled rejection:', event.reason);
  } catch {
    // ignore
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
