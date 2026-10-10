import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { AdminApp } from './AdminApp';

const container = document.getElementById('admin-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <AdminApp />
    </StrictMode>
  );
}
