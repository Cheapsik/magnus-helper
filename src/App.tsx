import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AmbientProvider } from "@/context/AmbientContext";
import { SceneProvider } from "@/context/SceneContext";
import { DrawerProvider } from "@/context/DrawerContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import { PageHeaderProvider } from "@/context/PageHeaderContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { CampaignProvider, useCampaigns } from "@/context/CampaignContext";
import { FirstCampaignScreen } from "@/components/campaign/FirstCampaignScreen";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { GlobalDrawer } from "@/components/global-drawer/GlobalDrawer";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import Index from "@/pages/Index";
import DicePage from "@/pages/DicePage";
import TestsPage from "@/pages/TestsPage";
import CheatSheetsPage from "@/pages/CheatSheetsPage";
import CombatPage from "@/pages/CombatPage";
import ConditionsPage from "@/pages/ConditionsPage";
import SessionNotesPage from "@/pages/SessionNotesPage";
import GmToolboxPage from "@/pages/GmToolboxPage";
import InventoryPage from "@/pages/InventoryPage";
import LootGeneratorPage from "@/pages/LootGeneratorPage";
import TimersPage from "@/pages/TimersPage";
import RumorsPage from "@/pages/RumorsPage";
import NotFound from "@/pages/NotFound";
import ShopPage from "@/pages/ShopPage";
import AmbientPage from "@/pages/AmbientPage";
import QuestsPage from "@/pages/QuestsPage";
import CardsPage from "@/pages/CardsPage";
import ScenePage from "@/pages/ScenePage";
import SettingsPage from "@/components/settings/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import { getRouterBasename } from "@/lib/authUrls";
import RelationsMapPage from "./pages/RelationsMapPage";
import SessionPrepPage from "@/pages/SessionPrepPage";
import ClocksPage from "@/pages/ClocksPage";
import RandomTablesPage from "@/pages/RandomTablesPage";
import FactionsPage from "@/pages/FactionsPage";
import PlayerScreenPage from "@/pages/PlayerScreenPage";
import CalendarPage from "@/pages/CalendarPage";
import ChroniclePage from "@/pages/ChroniclePage";
import MapsPage from "@/pages/MapsPage";
import GmScreenPage from "@/pages/GmScreenPage";
import TravelPage from "@/pages/TravelPage";
import SafetyPage from "@/pages/SafetyPage";
import DungeonGeneratorPage from "@/pages/DungeonGeneratorPage";
import MaterialsPage from "@/pages/MaterialsPage";
import EncounterBuilderPage from "@/pages/EncounterBuilderPage";
import NarrativePage from "@/pages/NarrativePage";
import SecretsPage from "@/pages/SecretsPage";
import PlayerApp from "@/pages/PlayerApp";
import { setPendingInvite, useAppRole, useMemberships, usePendingInvite } from "@/lib/sharedCampaigns";
import { useAuth } from "@/context/AuthContext";

function ProtectedApp() {
  return (
    <AuthGuard>
      <CampaignGate />
    </AuthGuard>
  );
}

/** An invite link works before signing in: the token waits until the player can join. */
function JoinLink() {
  const { token } = useParams();
  const { search, hash } = useLocation();
  if (token) setPendingInvite(token);
  // Google and e-mail sign-in return here with the session in the hash; keep it for supabase-js to read.
  return <Navigate to={{ pathname: "/player", search, hash }} replace />;
}

/** Players live under /player, whatever this device's role says; everything else is the GM app. */
function CampaignGate() {
  return (
    <Routes>
      <Route path="/player/*" element={<PlayerApp />} />
      <Route path="*" element={<GmEntry />} />
    </Routes>
  );
}

/**
 * Every GM screen reads campaign data, so nothing renders until a campaign exists. Someone with no
 * campaigns of their own who plays in others' is sent to the player panel instead of being asked to
 * create one.
 */
function GmEntry() {
  const { campaigns } = useCampaigns();
  const { user } = useAuth();
  const [role] = useAppRole();
  const [pendingInvite] = usePendingInvite();
  const checkMemberships = role !== "gm" && campaigns.length === 0;
  const memberships = useMemberships(checkMemberships ? user?.id : undefined);
  if (pendingInvite || role === "player") return <Navigate to="/player" replace />;
  if (checkMemberships) {
    if (memberships === undefined) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Wczytuję…</div>;
    if (memberships.length > 0) return <Navigate to="/player" replace />;
  }
  if (campaigns.length === 0) return <FirstCampaignScreen />;
  return (
    <Routes>
      {/* Shown on a second screen to the players, so it has none of the GM's chrome. */}
      <Route path="/player-screen" element={<PlayerScreenPage />} />
      <Route path="*" element={<GmApp />} />
    </Routes>
  );
}

function GmApp() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dice" element={<DicePage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/codex" element={<CheatSheetsPage />} />
          <Route path="/scena" element={<ScenePage />} />
          <Route path="/combat" element={<CombatPage />} />
          <Route path="/conditions" element={<ConditionsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/loot" element={<LootGeneratorPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/notes" element={<SessionNotesPage />} />
          <Route path="/relations" element={<RelationsMapPage />} />
          <Route path="/gm-toolbox" element={<GmToolboxPage />} />
          <Route path="/heroes" element={<CardsPage key="hero" kind="hero" />} />
          <Route path="/npcs" element={<CardsPage key="npc" kind="npc" />} />
          <Route path="/monsters" element={<CardsPage key="monster" kind="monster" />} />
          <Route path="/timers" element={<TimersPage />} />
          <Route path="/rumors" element={<RumorsPage />} />
          <Route path="/ambient" element={<AmbientPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/prep" element={<SessionPrepPage />} />
          <Route path="/clocks" element={<ClocksPage />} />
          <Route path="/tables" element={<RandomTablesPage />} />
          <Route path="/factions" element={<FactionsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/chronicle" element={<ChroniclePage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/gm-screen" element={<GmScreenPage />} />
          <Route path="/travel" element={<TravelPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/dungeon" element={<DungeonGeneratorPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/encounters" element={<EncounterBuilderPage />} />
          <Route path="/narrative" element={<NarrativePage />} />
          <Route path="/secrets" element={<SecretsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
      <GlobalDrawer />
      <CommandPalette />
    </>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="rpg_theme">
    <SettingsProvider>
      <TooltipProvider>
        <Toaster />
        <CampaignProvider>
          <AppProvider>
            <AmbientProvider>
              <SceneProvider>
                  <DrawerProvider>
                    <CommandPaletteProvider>
                      <PageHeaderProvider>
                      <BrowserRouter basename={getRouterBasename()}>
                        <AuthProvider>
                          <Routes>
                            <Route path="/auth" element={<AuthPage />} />
                            <Route path="/reset-password" element={<AuthPage />} />
                            <Route path="/join/:token" element={<JoinLink />} />
                            <Route path="/*" element={<ProtectedApp />} />
                          </Routes>
                        </AuthProvider>
                      </BrowserRouter>
                      </PageHeaderProvider>
                    </CommandPaletteProvider>
                  </DrawerProvider>
              </SceneProvider>
            </AmbientProvider>
          </AppProvider>
        </CampaignProvider>
      </TooltipProvider>
    </SettingsProvider>
  </ThemeProvider>
);

export default App;
