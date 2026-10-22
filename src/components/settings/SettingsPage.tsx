import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManager from "./CampaignManager";
import { useAppRole } from "@/lib/sharedCampaigns";
import { Button } from "@/components/ui/button";
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
        <RoleSwitch />
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

/** shortcut: the role is picked by hand on each device; access itself is checked by the server. */
function RoleSwitch() {
  const [role, setRole] = useAppRole();
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Tryb aplikacji</h2>
      <div className="flex gap-2">
        <Button variant={role === "gm" ? "default" : "outline"} size="sm" onClick={() => setRole("gm")}>
          Mistrz gry
        </Button>
        <Button variant={role === "player" ? "default" : "outline"} size="sm" onClick={() => setRole("player")}>
          Gracz
        </Button>
      </div>
      <p className="text-[length:--fs-meta] text-muted-foreground">
        W trybie Gracz widzisz tylko kampanie, do których dołączyłeś przez link, i materiały od Mistrza gry.
      </p>
    </section>
  );
}
