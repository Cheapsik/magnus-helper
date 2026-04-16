import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { migrateRpgStorageKeys } from "@/lib/rpgStorageMigration";

migrateRpgStorageKeys();

createRoot(document.getElementById("root")!).render(<App />);
