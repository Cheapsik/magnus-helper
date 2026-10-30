import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCampaigns } from "@/context/CampaignContext";
import { CampaignWizard } from "@/components/campaign/CampaignWizard";

/** Creates a campaign through the wizard and opens it straight away. */
export function NewCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { createCampaign, switchCampaign } = useCampaigns();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nowa kampania</DialogTitle>
          <DialogDescription>Każda kampania ma własny system: karty, testy, walkę, stany i walutę.</DialogDescription>
        </DialogHeader>
        {open && (
          <CampaignWizard
            onCancel={() => onOpenChange(false)}
            finishLabel="Utwórz i przejdź"
            onFinish={({ name, start, refine, copyFromCampaignId }) => {
              const campaign = createCampaign(name, start, copyFromCampaignId);
              switchCampaign(campaign.id, refine ? "settings?tab=karty" : "");
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
