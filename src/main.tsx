import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import LoadingDie from "./components/LoadingDie";
import { resetDataFromPreviousVersions } from "@/lib/dataReset";
import { registerSW } from "virtual:pwa-register";
import { startCloudSync } from "@/lib/cloudSync";

resetDataFromPreviousVersions();
registerSW({ immediate: true });

const root = createRoot(document.getElementById("root")!);
root.render(
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-sm text-muted-foreground" role="status">
    <LoadingDie />
    Wczytuję…
  </div>,
);
// The app reads campaign data synchronously, so the account's copy has to be on this device first.
void startCloudSync().finally(() => root.render(<App />));
