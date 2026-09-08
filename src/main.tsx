import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Police de la maquette, embarquée dans le bundle (OFL 1.1) : aucune requête réseau.
import '@fontsource-variable/space-grotesk';
import './ui/theme/tokens.css';
import './ui/theme/base.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Élément #root introuvable dans index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
