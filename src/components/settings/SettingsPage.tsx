import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManager from "./CampaignManager";
import DataManager from "./DataManager";
import { CardStructureEditor } from "@/components/system/CardStructureEditor";
import { TestTypesEditor } from "@/components/system/TestTypesEditor";
import { CombatSettingsEditor } from "@/components/system/CombatSettingsEditor";
import { ConditionsEditor } from "@/components/system/ConditionsEditor";
import { CurrencyEditor } from "@/components/system/CurrencyEditor";

const TABS = [
  { value: "kampanie", label: "Kampanie i dane" },
  { value: "karty", label: "Karty" },
  { value: "testy", label: "Testy" },
  { value: "walka", label: "Walka" },
  { value: "stany", label: "Stany" },
  { value: "waluta", label: "Waluta" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = TABS.some((t) => t.value === requested) ? (requested as Tab) : "kampanie";

  return (
    <Tabs value={tab} onValueChange={(next) => setParams({ tab: next }, { replace: true })} className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="kampanie" className="space-y-6">
        <CampaignManager />
        <DataManager />
      </TabsContent>
      <TabsContent value="karty">
        <CardStructureEditor />
      </TabsContent>
      <TabsContent value="testy">
        <TestTypesEditor />
      </TabsContent>
      <TabsContent value="walka">
        <CombatSettingsEditor />
      </TabsContent>
      <TabsContent value="stany">
        <ConditionsEditor />
      </TabsContent>
      <TabsContent value="waluta">
        <CurrencyEditor />
      </TabsContent>
    </Tabs>
  );
}
