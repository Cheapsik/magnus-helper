import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AmbientProvider } from "@/context/AmbientContext";
import { ModeProvider } from "@/context/ModeContext";
import { SceneProvider } from "@/context/SceneContext";
import { DrawerProvider } from "@/context/DrawerContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { GlobalDrawer } from "@/components/global-drawer/GlobalDrawer";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import Index from "@/pages/Index";
import DicePage from "@/pages/DicePage";
import TestsPage from "@/pages/TestsPage";
import CheatSheetsPage from "@/pages/CheatSheetsPage";
import CharacterPage from "@/pages/CharacterPage";
import CombatPage from "@/pages/CombatPage";
import ConditionsPage from "@/pages/ConditionsPage";
import SessionNotesPage from "@/pages/SessionNotesPage";
import GmToolboxPage from "@/pages/GmToolboxPage";
import NpcManagerPage from "@/pages/NpcManagerPage";
import InventoryPage from "@/pages/InventoryPage";
import LootGeneratorPage from "@/pages/LootGeneratorPage";
import TimersPage from "@/pages/TimersPage";
import RumorsPage from "@/pages/RumorsPage";
import NotFound from "@/pages/NotFound";
import SimulationsPage from "@/pages/SimulationsPage";
import ShopPage from "@/pages/ShopPage";
import AmbientPage from "@/pages/AmbientPage";
import QuestsPage from "@/pages/QuestsPage";
import HeroesPage from "@/pages/HeroesPage";
import ScenePage from "@/pages/ScenePage";
import SettingsPage from "@/components/settings/SettingsPage";
import AuthPage from "@/pages/AuthPage";
import { getRouterBasename } from "@/lib/authUrls";
import RelationsMapPage from "./pages/RelationsMapPage";

function ProtectedApp() {
  return (
    <AuthGuard>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dice" element={<DicePage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/codex" element={<CheatSheetsPage />} />
          <Route path="/scena" element={<ScenePage />} />
          <Route path="/character" element={<CharacterPage />} />
          <Route path="/combat" element={<CombatPage />} />
          <Route path="/simulations" element={<SimulationsPage />} />
          <Route path="/conditions" element={<ConditionsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/loot" element={<LootGeneratorPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/notes" element={<SessionNotesPage />} />
          <Route path="/relations" element={<RelationsMapPage />} />
          <Route path="/gm-toolbox" element={<GmToolboxPage />} />
          <Route path="/npcs" element={<NpcManagerPage />} />
          <Route path="/heroes" element={<HeroesPage />} />
          <Route path="/timers" element={<TimersPage />} />
          <Route path="/rumors" element={<RumorsPage />} />
          <Route path="/ambient" element={<AmbientPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
      <GlobalDrawer />
      <CommandPalette />
    </AuthGuard>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="rpg_theme">
    <SettingsProvider>
      <TooltipProvider>
        <Toaster />
        <AppProvider>
          <AmbientProvider>
            <SceneProvider>
              <ModeProvider>
                <DrawerProvider>
                  <CommandPaletteProvider>
                    <BrowserRouter basename={getRouterBasename()}>
                      <AuthProvider>
                        <Routes>
                          <Route path="/auth" element={<AuthPage />} />
                          <Route path="/reset-password" element={<AuthPage />} />
                          <Route path="/*" element={<ProtectedApp />} />
                        </Routes>
                      </AuthProvider>
                    </BrowserRouter>
                  </CommandPaletteProvider>
                </DrawerProvider>
              </ModeProvider>
            </SceneProvider>
          </AmbientProvider>
        </AppProvider>
      </TooltipProvider>
    </SettingsProvider>
  </ThemeProvider>
);

export default App;
