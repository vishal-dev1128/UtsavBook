import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      void reg.unregister();
    }
  });
}

// Global runtime error display — shows crash details on the blue screen
// instead of silently showing a blank page.
window.addEventListener('error', (ev) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<div style="position:fixed;inset:0;background:#1D4ED8;display:flex;align-items:center;justify-content:center;padding:24px;z-index:9999"><div style="background:#fff;border-radius:16px;padding:24px;max-width:420px;width:100%;font-family:system-ui,sans-serif;box-shadow:0 20px 48px rgba(0,0,0,0.2)"><div style="font-size:18px;font-weight:800;color:#0F172A;margin-bottom:8px">⚠️ App Error</div><div style="font-size:13px;color:#E11D48;background:#FFF1F2;border-radius:8px;padding:12px;margin-bottom:12px;word-break:break-all;font-family:monospace">${ev.message || 'Unknown error'}</div><div style="font-size:11px;color:#64748B">${(ev.filename || '') + (ev.lineno ? ':' + ev.lineno : '')}</div><button onclick="location.reload()" style="margin-top:16px;width:100%;padding:10px;background:#2563EB;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Reload App</button></div></div>`;
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    const msg = ev.reason instanceof Error ? ev.reason.message : String(ev.reason);
    root.innerHTML = `<div style="position:fixed;inset:0;background:#1D4ED8;display:flex;align-items:center;justify-content:center;padding:24px;z-index:9999"><div style="background:#fff;border-radius:16px;padding:24px;max-width:420px;width:100%;font-family:system-ui,sans-serif;box-shadow:0 20px 48px rgba(0,0,0,0.2)"><div style="font-size:18px;font-weight:800;color:#0F172A;margin-bottom:8px">⚠️ Startup Error</div><div style="font-size:13px;color:#E11D48;background:#FFF1F2;border-radius:8px;padding:12px;margin-bottom:12px;word-break:break-all;font-family:monospace">${msg}</div><button onclick="location.reload()" style="margin-top:16px;width:100%;padding:10px;background:#2563EB;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Reload App</button></div></div>`;
  }
});

createRoot(document.getElementById('root')!).render(<App />);
