import { ThemeProvider } from "next-themes";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
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
import LootGeneratorPage from "@/pages/LootGeneratorPage";
import TimersPage from "@/pages/TimersPage";
import RumorsPage from "@/pages/RumorsPage";
import NotFound from "@/pages/NotFound";
import SimulationsPage from "./pages/SimulationsPage";

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <TooltipProvider>
      <Toaster />
      <AppProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dice" element={<DicePage />} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="/codex" element={<CheatSheetsPage />} />
              <Route path="/character" element={<CharacterPage />} />
              <Route path="/combat" element={<CombatPage />} />
              <Route path="/simulations" element={<SimulationsPage />} />
              <Route path="/conditions" element={<ConditionsPage />} />
              <Route path="/inventory" element={<LootGeneratorPage />} />
              <Route path="/loot" element={<Navigate to="/inventory" replace />} />
              <Route path="/notes" element={<SessionNotesPage />} />
              <Route path="/gm-toolbox" element={<GmToolboxPage />} />
              <Route path="/npcs" element={<NpcManagerPage />} />
              <Route path="/timers" element={<TimersPage />} />
              <Route path="/rumors" element={<RumorsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </HashRouter>
      </AppProvider>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
