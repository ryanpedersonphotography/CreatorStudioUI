import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import './styles.css';
import App, { studioStore } from './app/app.js';
import { applyStoredTheme } from './app/use-theme.js';

// Before the first render, so the remembered theme is on <html> when React paints.
applyStoredTheme(studioStore);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
