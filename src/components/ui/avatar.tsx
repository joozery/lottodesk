"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";
import { initialOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-rose-100 text-rose-700",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const tone = TONES[Array.from(name).reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];
  return (
    <AvatarPrimitive.Root
      className={cn("inline-flex size-9 shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold", tone, className)}
    >
      <AvatarPrimitive.Fallback>{initialOf(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
