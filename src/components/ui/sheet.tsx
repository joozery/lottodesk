"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "@/components/icons";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  side?: "left" | "right" | "bottom";
}

export function SheetContent({ side = "right", className, children, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-white shadow-xl",
          side === "bottom"
            ? "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            : cn("inset-y-0 w-[88vw] max-w-md max-sm:w-full max-sm:max-w-none", side === "left" ? "left-0" : "right-0"),
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="ปิด"
        >
          <X />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
