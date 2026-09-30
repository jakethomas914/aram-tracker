"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { championIconUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChampionBadge({
  champion,
  ddragonVersion,
  className,
  size = "md",
}: {
  champion: string;
  ddragonVersion: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const url = championIconUrl(champion, ddragonVersion);

  return (
    <Avatar
      size={size === "sm" ? "sm" : "default"}
      className={cn("rounded-md after:rounded-md", className)}
    >
      {url ? <AvatarImage src={url} alt={champion} className="rounded-md" /> : null}
      <AvatarFallback className="rounded-md text-[10px] font-semibold">
        {champion.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
