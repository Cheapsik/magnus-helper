import { Label } from "@/components/ui/label";

export function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className={multiline ? "text-foreground whitespace-pre-wrap text-sm" : "text-foreground text-sm"}>
        {value}
      </div>
    </div>
  );
}
