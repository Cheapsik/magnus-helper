import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManager from "./CampaignManager";
import DataManager from "./DataManager";
import { CardStructureEditor } from "@/components/system/CardStructureEditor";

const TABS = ["kampanie", "karty"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "kampanie";

  return (
    <Tabs value={tab} onValueChange={(next) => setParams({ tab: next }, { replace: true })} className="space-y-4">
      <TabsList>
        <TabsTrigger value="kampanie">Kampanie i dane</TabsTrigger>
        <TabsTrigger value="karty">System: karty</TabsTrigger>
      </TabsList>
      <TabsContent value="kampanie" className="space-y-6">
        <CampaignManager />
        <DataManager />
      </TabsContent>
      <TabsContent value="karty">
        <CardStructureEditor />
      </TabsContent>
    </Tabs>
  );
}
