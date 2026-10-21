import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { resetDataFromPreviousVersions } from "@/lib/dataReset";
import { registerSW } from "virtual:pwa-register";

resetDataFromPreviousVersions();
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
