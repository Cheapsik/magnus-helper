import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ensureInitialCampaign, resetDataFromPreviousVersions } from "@/lib/dataReset";

resetDataFromPreviousVersions();
ensureInitialCampaign();

createRoot(document.getElementById("root")!).render(<App />);
