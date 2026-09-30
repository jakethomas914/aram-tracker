import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "win" | "loss" | "primary";
}) {
  const valueTone = {
    default: "text-foreground",
    win: "text-win",
    loss: "text-loss",
    primary: "text-primary",
  }[tone];

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <p className={cn("text-2xl leading-tight font-semibold sm:text-3xl", valueTone)}>
            {value}
          </p>
          {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
        </div>
        {icon ? (
          <span className="text-muted-foreground/70 bg-muted/60 rounded-lg p-2">{icon}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}
