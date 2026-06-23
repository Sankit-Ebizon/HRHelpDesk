"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { beginLoading, resetGlobalLoading, subscribeGlobalLoading } from "@/lib/loading-store";

const NAV_LOADER_DELAY_MS = 120;
const LOADER_SAFETY_TIMEOUT_MS = 15000;

function shouldIgnoreHref(href: string) {
  const v = href.trim();
  if (!v) return true;
  if (v.startsWith("#")) return true;
  if (v.startsWith("mailto:") || v.startsWith("tel:")) return true;
  if (v.startsWith("http://") || v.startsWith("https://")) return true;
  return false;
}

function resolveHref(href: string): string {
  try {
    const url = new URL(href, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

function currentLocation(pathname: string, searchKey: string): string {
  return `${pathname}${searchKey ? `?${searchKey}` : ""}`;
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
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [visible, setVisible] = React.useState(false);
  const showTimerRef = React.useRef<number | null>(null);
  const navStartedRef = React.useRef(false);

  const clearShowTimer = React.useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => subscribeGlobalLoading(setVisible), []);

  React.useEffect(() => {
    clearShowTimer();
    navStartedRef.current = false;
    resetGlobalLoading();
  }, [pathname, searchKey, clearShowTimer]);

  React.useEffect(() => {
    if (!visible) return;
    const safetyTimer = window.setTimeout(() => {
      resetGlobalLoading();
    }, LOADER_SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(safetyTimer);
  }, [visible]);

  React.useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      if (link.getAttribute("data-no-loader") === "true") return;
      if (link.getAttribute("target") === "_blank") return;
      if (link.hasAttribute("download")) return;
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = link.getAttribute("href") || "";
      if (shouldIgnoreHref(href)) return;
      if (!href.startsWith("/")) return;

      const destination = resolveHref(href);
      const current = currentLocation(pathname, searchKey);
      if (destination === current) return;

      clearShowTimer();
      navStartedRef.current = true;
      showTimerRef.current = window.setTimeout(() => {
        if (navStartedRef.current) {
          beginLoading();
        }
      }, NAV_LOADER_DELAY_MS);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      clearShowTimer();
    };
  }, [pathname, searchKey, clearShowTimer]);

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
