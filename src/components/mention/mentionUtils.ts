export interface MentionToken {
  type: string;
  id: string;
  label: string;
  raw: string;
  start: number;
  end: number;
}

const MENTION_REGEX = /@\[([^:\]]+):([^:\]]+):([^\]]+)\]/g;

export function parseMentionTokens(text: string): MentionToken[] {
  const tokens: MentionToken[] = [];
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    tokens.push({
      type: match[1],
      id: match[2],
      label: match[3],
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

export function stringifyMention(type: string, id: string, label: string): string {
  return `@[${type}:${id}:${label}]`;
}

export function replaceMentionWithPlainText(text: string, token: MentionToken): string {
  return `${text.slice(0, token.start)}${token.label}${text.slice(token.end)}`;
}
