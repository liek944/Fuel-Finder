import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { OwnerThemeProvider } from './contexts/OwnerThemeContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <OwnerThemeProvider>
        <App />
      </OwnerThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
