"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SetupCategory } from "@/lib/settings-catalog-data";
import { cn } from "@/lib/utils";

const SETUP_SIDEBAR_WIDTH = 260;

interface SetupSidebarNavProps {
  categories: SetupCategory[];
}

export function SetupSidebarNav({ categories }: SetupSidebarNavProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return categories;

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const haystack = [item.label, category.title, ...(item.keywords ?? [])]
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalized);
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, query]);

  return (
    <aside
      style={{ width: SETUP_SIDEBAR_WIDTH }}
      className="flex shrink-0 flex-col border-r border-[#1a2744] bg-[#152238] text-white"
    >
      <div className="border-b border-white/10 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search setup and configuration"
            className="h-8 rounded border-white/15 bg-[#0f1829] pl-8 text-xs text-white shadow-none placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-white/10"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filteredCategories.map((category) => (
          <div key={category.title} className="mb-1">
            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              {category.title}
            </p>
            <ul>
              {category.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block px-4 py-2 text-sm transition-colors",
                        active
                          ? "bg-white/10 font-medium text-white"
                          : "text-white/75 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export { SETUP_SIDEBAR_WIDTH };
