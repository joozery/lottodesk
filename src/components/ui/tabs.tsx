"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("flex gap-6 overflow-x-auto overflow-y-hidden border-b border-slate-200", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px whitespace-nowrap border-b-2 border-transparent px-1 pb-3 pt-1 text-sm max-md:pb-3.5 max-md:text-[15px] font-medium text-slate-500 transition-colors hover:text-slate-800 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600",
        className,
      )}
      {...props}
    />
  );
}
