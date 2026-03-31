import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Registro do PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registrado: ', registration);
    }).catch(registrationError => {
      console.log('SW falhou: ', registrationError);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);