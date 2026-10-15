import type { ReactNode } from "react";

export function Section({
  title,
  children,
  wide,
  className,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <section
      className={["paper-section", wide ? "paper-section-wide" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="paper-section-header">{title}</header>
      <div className="paper-section-body">{children}</div>
    </section>
  );
}
