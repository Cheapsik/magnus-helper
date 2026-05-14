import { Settings as SettingsIcon } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import DataManager from "./DataManager";

export default function SettingsPage() {
  return (
    <div className="w-full max-w-none space-y-6">
      <header className="flex items-center gap-2.5">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h1 className="font-app-brand text-2xl tracking-wide text-foreground">Ustawienia</h1>
      </header>

      <ThemeSelector />
      <div className="h-px bg-border" />
      <DataManager />
    </div>
  );
}
