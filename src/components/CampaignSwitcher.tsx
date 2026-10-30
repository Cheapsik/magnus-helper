import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Plus, Settings as SettingsIcon, Tent } from "lucide-react";
import { useCampaigns } from "@/context/CampaignContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewCampaignDialog } from "@/components/campaign/NewCampaignDialog";

/** Header switcher — Decyzja 1: przełącznik po prawej, obok ustawień, ze skrótem tworzenia. */
export default function CampaignSwitcher({ className }: { className?: string }) {
  const { campaigns, activeCampaign, switchCampaign } = useCampaigns();
  const [creating, setCreating] = useState(false);

  const visibleCampaigns = campaigns.filter((c) => !c.archivedAt);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs text-foreground border border-border bg-transparent hover:bg-white/5 transition-colors max-w-[220px]",
              className,
            )}
          >
            <Tent className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 min-w-0 truncate text-left">
              {activeCampaign?.name ?? "Brak kampanii"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Kampanie</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {visibleCampaigns.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">Nie masz jeszcze żadnej kampanii.</div>
          )}
          {visibleCampaigns.map((campaign) => (
            <DropdownMenuItem
              key={campaign.id}
              onSelect={() => {
                if (campaign.id !== activeCampaign?.id) switchCampaign(campaign.id);
              }}
              className="gap-2"
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", campaign.id === activeCampaign?.id ? "opacity-100" : "opacity-0")} />
              <span className="flex-1 truncate">{campaign.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Nowa kampania
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="gap-2">
            <Link to="/settings">
              <SettingsIcon className="h-3.5 w-3.5" />
              Zarządzaj kampaniami
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewCampaignDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
