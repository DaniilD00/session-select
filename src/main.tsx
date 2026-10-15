import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// Fonts are bundled and served from our own domain rather than Google Fonts,
// so no visitor data goes to a third party before cookie consent.
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
