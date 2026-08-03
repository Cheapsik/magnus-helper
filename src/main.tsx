import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { migrateRpgStorageKeys } from "@/lib/rpgStorageMigration";
import { ensureDefaultCampaignMigration } from "@/lib/campaignMigration";

migrateRpgStorageKeys();
ensureDefaultCampaignMigration();

createRoot(document.getElementById("root")!).render(<App />);
