import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/app/globals.css';  // Estilos globais do projeto unificado
import LiaOS from '@/app/page';  // App principal com os 3 painéis

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LiaOS />
  </React.StrictMode>
);