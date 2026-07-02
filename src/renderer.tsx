/**
 * This file is automatically loaded by Vite and runs in the "renderer" context.
 * It mounts the React application. Node.js integration is disabled here; the
 * renderer talks to the main process through the preload bridge (`window.livekit`).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
