"use client";

import { usePathname } from "next/navigation";
import { SetupSidebarNav } from "@/components/settings/setup-sidebar-nav";
import type { SetupCategory } from "@/lib/settings-catalog-data";

interface SettingsLayoutShellProps {
  categories: SetupCategory[];
  children: React.ReactNode;
}

export function SettingsLayoutShell({ categories, children }: SettingsLayoutShellProps) {
  const pathname = usePathname();
  const isSetupHome = pathname === "/settings";

  if (isSetupHome) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--top-nav-height,48px))] bg-white">
      <SetupSidebarNav categories={categories} />
      <div className="min-w-0 flex-1 bg-white">{children}</div>
    </div>
  );
}
