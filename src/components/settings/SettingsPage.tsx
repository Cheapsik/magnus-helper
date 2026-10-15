import CampaignManager from "./CampaignManager";
import DataManager from "./DataManager";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <CampaignManager />
      <DataManager />
    </div>
  );
}
