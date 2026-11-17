import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./App.css";
import { CartProvider } from "./contexts/CartContext";

// Service worker registration is handled by useAppUpdate hook in App.tsx
// This provides user-controlled updates without disrupting active sessions

createRoot(document.getElementById("root")!).render(
  <CartProvider>
    <App />
  </CartProvider>
);
