import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border/70 bg-card/40 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      {icon ? <span className="text-muted-foreground/70">{icon}</span> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {action}
    </div>
  );
}
