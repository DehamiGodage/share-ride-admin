import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './theme/tokens.css';
import './theme/layout.css';
import App from './App';
import { AuthProvider } from './app/AuthContext';

async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
    console.info('[mocks] MSW is running');
  } catch (err) {
    console.error('[mocks] Could not start MSW, using the real API instead', err);
  }
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
});