import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { resetDataFromPreviousVersions } from "@/lib/dataReset";
import { registerSW } from "virtual:pwa-register";
import { startCloudSync } from "@/lib/cloudSync";

resetDataFromPreviousVersions();
registerSW({ immediate: true });

const root = createRoot(document.getElementById("root")!);
root.render(<div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Wczytuję…</div>);
// The app reads campaign data synchronously, so the account's copy has to be on this device first.
void startCloudSync().finally(() => root.render(<App />));
