import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { buildSearchIndex, type SearchResultItem } from "@/components/command-palette/searchUtils";
import { MentionDropdown } from "@/components/mention/MentionDropdown";
import { parseMentionTokens, replaceMentionWithPlainText, stringifyMention, type MentionToken } from "@/components/mention/mentionUtils";
import { useDrawer } from "@/context/DrawerContext";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  className?: string;
}

function mapTypeToDrawerType(type: string): "npc" | "monster" | "item" | "quest" | "hero" {
  switch (type.toLowerCase()) {
    case "npc":
      return "npc";
    case "potwor":
    case "monster":
      return "monster";
    case "przedmiot":
    case "item":
      return "item";
    case "bohater":
    case "hero":
      return "hero";
    default:
      return "quest";
  }
}

export function MentionTextarea({ value, onChange, placeholder, className }: MentionTextareaProps) {
  const { openDrawer } = useDrawer();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const index = useMemo(() => buildSearchIndex(), []);
  const tokens = useMemo(() => parseMentionTokens(value), [value]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const base = normalized ? index.filter((item) => item.keywords.includes(normalized)) : index;
    return base.slice(0, 7);
  }, [index, query]);

  const isDropdownOpen = isEditing && triggerStart !== null;

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filtered.length]);

  const closeDropdown = () => {
    setTriggerStart(null);
    setQuery("");
    setActiveIndex(0);
  };

  const selectMention = (item: SearchResultItem) => {
    const textarea = textareaRef.current;
    if (!textarea || triggerStart === null) return;
    const caret = textarea.selectionStart;
    const token = stringifyMention(item.typeLabel, item.id, item.title);
    const nextValue = `${value.slice(0, triggerStart)}${token} ${value.slice(caret)}`;
    onChange(nextValue);
    closeDropdown();
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCaret = triggerStart + token.length + 1;
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
    const textarea = textareaRef.current;
    if (!textarea) return;
    const caret = textarea.selectionStart;
    const chunk = nextValue.slice(0, caret);
    const mentionMatch = chunk.match(/@([^\s@]*)$/);
    if (mentionMatch) {
      const start = caret - mentionMatch[0].length;
      setTriggerStart(start);
      setQuery(mentionMatch[1] ?? "");
      return;
    }
    closeDropdown();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isDropdownOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length));
      return;
    }
    if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      selectMention(filtered[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  };

  const renderPreview = () => {
    if (tokens.length === 0) {
      return <span className="text-muted-foreground">{value || placeholder}</span>;
    }
    const segments: ReactNode[] = [];
    let cursor = 0;
    tokens.forEach((token, indexToken) => {
      if (cursor < token.start) {
        segments.push(<span key={`text-${indexToken}`}>{value.slice(cursor, token.start)}</span>);
      }
      segments.push(
        <button
          key={`token-${token.id}-${indexToken}`}
          type="button"
          className={cn(
            "mx-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-transform duration-100 hover:scale-105",
            "bg-primary/15 text-primary",
          )}
          onClick={() => openDrawer(mapTypeToDrawerType(token.type), token.id, token.label)}
          onContextMenu={(event) => {
            event.preventDefault();
            const next = replaceMentionWithPlainText(value, token);
            onChange(next);
          }}
        >
          @{token.label}
        </button>,
      );
      cursor = token.end;
    });
    if (cursor < value.length) {
      segments.push(<span key="tail">{value.slice(cursor)}</span>);
    }
    return segments;
  };

  return (
    <div className="relative">
      {isEditing ? (
        <>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={() => {
              closeDropdown();
              setIsEditing(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              className,
            )}
          />
          <MentionDropdown isOpen={isDropdownOpen} items={filtered} activeIndex={activeIndex} onSelect={selectMention} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsEditing(true);
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
          className={cn(
            "min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm",
            className,
          )}
        >
          {renderPreview()}
        </button>
      )}
    </div>
  );
}
