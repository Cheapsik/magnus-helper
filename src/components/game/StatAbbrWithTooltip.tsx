import type { ReactNode } from "react";
import type { GameStatKey } from "@/lib/gameStatGlossary";
import { getStatFullName, getStatTooltipByAbbr, getStatTooltipByExactAbbr } from "@/lib/gameStatGlossary";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type StatAbbrWithTooltipProps = {
  statKey?: GameStatKey;
  abbr?: string;
  tooltip?: string;
  children: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
};

export function StatAbbrWithTooltip({
  statKey,
  abbr,
  tooltip: tooltipProp,
  children,
  className,
  side = "top",
}: StatAbbrWithTooltipProps) {
  const fromKey = statKey ? getStatFullName(statKey) : undefined;
  const fromAbbr = abbr ? getStatTooltipByAbbr(abbr) : undefined;
  const tooltipText = tooltipProp ?? fromKey ?? fromAbbr;

  if (!tooltipText) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help", className)}>{children}</span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-left">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}

export function StatAbbrFromCharacterStat({
  abbr,
  label,
  children,
  className,
  side,
}: {
  abbr: string;
  label: string;
  children: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const exact = getStatTooltipByExactAbbr(abbr);
  return (
    <StatAbbrWithTooltip tooltip={exact ?? label} className={className} side={side}>
      {children}
    </StatAbbrWithTooltip>
  );
}
