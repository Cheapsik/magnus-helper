import Logo from "@/components/Logo";
import { useCampaigns } from "@/context/CampaignContext";
import { CampaignWizard } from "@/components/campaign/CampaignWizard";

/** Shown instead of the app until the GM has a campaign to work in. */
export function FirstCampaignScreen() {
  const { createCampaign, switchCampaign } = useCampaigns();

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-10 sm:items-center">
      <div className="w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <Logo />
          <h1 className="text-[length:--fs-title] font-semibold">Załóż pierwszą kampanię</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Magnus Helper nie zakłada żadnego systemu gry. Kampania niesie własne karty, testy i zasady walki, więc ta sama
            aplikacja posłuży do każdej gry, którą prowadzisz.
          </p>
        </header>
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <CampaignWizard
            onFinish={({ name, start, refine }) => {
              const campaign = createCampaign(name, start);
              switchCampaign(campaign.id, refine ? "settings?tab=karty" : "");
            }}
          />
        </div>
      </div>
    </div>
  );
}
