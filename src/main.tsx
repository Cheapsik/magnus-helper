import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { resetDataFromPreviousVersions } from "@/lib/dataReset";

resetDataFromPreviousVersions();

createRoot(document.getElementById("root")!).render(<App />);
