import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RefPicker({
  value,
  options,
  onPick,
  placeholder,
}: {
  value?: string;
  options: { id: string; label: string }[];
  onPick: (id: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onPick}>
      <SelectTrigger className="h-12">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
