import { ThemeProvider } from "next-themes";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AmbientProvider } from "@/context/AmbientContext";
import { ModeProvider } from "@/context/ModeContext";
import { SceneProvider } from "@/context/SceneContext";
import { DrawerProvider } from "@/context/DrawerContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import Layout from "@/components/Layout";
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

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="rpg_theme">
    <TooltipProvider>
      <Toaster />
      <AppProvider>
        <AmbientProvider>
          <SceneProvider>
            <ModeProvider>
              <DrawerProvider>
                <CommandPaletteProvider>
                  <HashRouter>
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
                        <Route path="/gm-toolbox" element={<GmToolboxPage />} />
                        <Route path="/npcs" element={<NpcManagerPage />} />
                        <Route path="/heroes" element={<HeroesPage />} />
                        <Route path="/timers" element={<TimersPage />} />
                        <Route path="/rumors" element={<RumorsPage />} />
                        <Route path="/ambient" element={<AmbientPage />} />
                        <Route path="/quests" element={<QuestsPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                    <GlobalDrawer />
                    <CommandPalette />
                  </HashRouter>
                </CommandPaletteProvider>
              </DrawerProvider>
            </ModeProvider>
          </SceneProvider>
        </AmbientProvider>
      </AppProvider>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
