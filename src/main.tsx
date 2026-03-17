import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installDomSafetyGuards } from "./lib/dom-safety";

installDomSafetyGuards();

createRoot(document.getElementById("root")!).render(<App />);
