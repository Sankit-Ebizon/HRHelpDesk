"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { resetGlobalLoading, setGlobalLoading, subscribeGlobalLoading } from "@/lib/loading-store";

function shouldIgnoreHref(href: string) {
  const v = href.trim();
  if (!v) return true;
  if (v.startsWith("#")) return true;
  if (v.startsWith("mailto:") || v.startsWith("tel:")) return true;
  if (v.startsWith("http://") || v.startsWith("https://")) return true;
  return false;
}

function LoadingText() {
  return (
    <div className="loader-enter flex items-center gap-0.5 rounded-2xl glass-panel px-8 py-4 shadow-glow">
      <span className="text-sm font-semibold tracking-tight gradient-text">Loading</span>
      <span className="inline-flex w-[1.1em] text-primary">
        <span className="loader-dot">.</span>
        <span className="loader-dot">.</span>
        <span className="loader-dot">.</span>
      </span>
    </div>
  );
}

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);
  const showTimerRef = React.useRef<number | null>(null);

  const clearShowTimer = React.useCallback(() => {
    if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
  }, []);

  React.useEffect(() => subscribeGlobalLoading(setVisible), []);

  React.useEffect(() => {
    resetGlobalLoading();
    clearShowTimer();
  }, [pathname, clearShowTimer]);

  React.useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      if (link.getAttribute("data-no-loader") === "true") return;
      if (link.getAttribute("target") === "_blank") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href") || "";
      if (shouldIgnoreHref(href)) return;
      if (!href.startsWith("/")) return;

      clearShowTimer();
      showTimerRef.current = window.setTimeout(() => setGlobalLoading(true), 120);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      clearShowTimer();
    };
  }, [clearShowTimer]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[200] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" aria-hidden />
      <div className="relative z-10">
        <LoadingText />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
