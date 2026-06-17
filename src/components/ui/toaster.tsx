"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { CheckCircle2, Info, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dismissToast,
  getToasts,
  toast as toastApi,
  type ToastItem,
  type ToastVariant,
  useToastStoreSubscribe,
} from "@/lib/toast-store";

function getVariantStyles(variant: ToastVariant | undefined) {
  switch (variant) {
    case "success":
      return {
        icon: CheckCircle2,
        container: "border-emerald-500/20 glass-panel",
        iconWrap: "bg-emerald-500/15 text-emerald-400",
        title: "text-foreground",
        description: "text-muted-foreground",
        accent: "bg-emerald-500",
      };
    case "error":
      return {
        icon: AlertCircle,
        container: "border-red-500/20 glass-panel",
        iconWrap: "bg-red-500/15 text-red-400",
        title: "text-foreground",
        description: "text-muted-foreground",
        accent: "bg-red-500",
      };
    default:
      return {
        icon: Info,
        container: "border-border glass-panel",
        iconWrap: "bg-indigo-500/15 text-indigo-400",
        title: "text-foreground",
        description: "text-muted-foreground",
        accent: "bg-primary",
      };
  }
}

export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>(() => getToasts());

  React.useEffect(() => useToastStoreSubscribe(setItems), []);

  return (
    <ToastPrimitives.Provider swipeDirection="right">
      {items.map((t) => {
        const styles = getVariantStyles(t.variant);
        const Icon = styles.icon;

        return (
          <ToastPrimitives.Root
            key={t.id}
            duration={t.durationMs ?? 4000}
            onOpenChange={(open) => {
              if (!open) dismissToast(t.id);
            }}
            className={cn(
              "relative z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3",
              "overflow-hidden rounded-xl border p-4 shadow-elevated",
              "animate-slide-up",
              styles.container
            )}
          >
            <div className={cn("absolute left-0 top-0 h-full w-1", styles.accent)} />

            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", styles.iconWrap)}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <ToastPrimitives.Title className={cn("text-sm font-semibold", styles.title)}>
                {t.title}
              </ToastPrimitives.Title>
              {t.description && (
                <ToastPrimitives.Description className={cn("mt-1 text-sm leading-relaxed", styles.description)}>
                  {t.description}
                </ToastPrimitives.Description>
              )}
            </div>

            <ToastPrimitives.Close className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
              <X className="h-3.5 w-3.5" />
            </ToastPrimitives.Close>
          </ToastPrimitives.Root>
        );
      })}

      <ToastPrimitives.Viewport className="fixed right-4 top-4 z-[110] flex w-[400px] max-w-full flex-col gap-2" />
    </ToastPrimitives.Provider>
  );
}

export { toastApi as toast };
