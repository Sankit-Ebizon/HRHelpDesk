"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SetupCategory } from "@/lib/settings-catalog-data";
import { cn } from "@/lib/utils";

interface SetupHubProps {
  categories: SetupCategory[];
}

export function SetupHub({ categories }: SetupHubProps) {
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
    <div className="min-h-[calc(100vh-var(--top-nav-height,48px))] bg-[#eef1f5] text-zinc-900">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:grid sm:grid-cols-[1fr_minmax(280px,36rem)_1fr] sm:items-center sm:gap-4">
          <h1 className="self-start text-xl font-semibold tracking-tight text-zinc-900">
            Setup (s)
          </h1>
          <div className="relative mx-auto w-full max-w-xl sm:mx-0 sm:max-w-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search setup and configuration..."
              className="h-9 w-full rounded-md border-zinc-300 bg-white pl-9 text-zinc-900 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-400 focus-visible:ring-zinc-200"
            />
          </div>
          <div className="hidden sm:block" aria-hidden />
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {filteredCategories.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            No setup options match your search.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredCategories.map((category) => (
              <section
                key={category.title}
                className="flex min-h-[220px] flex-col overflow-hidden rounded border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <div className="border-b border-zinc-200">
                  <h2 className="px-5 py-3 text-sm font-bold uppercase tracking-wide text-zinc-900">
                    {category.title}
                  </h2>
                </div>
                <ul className="flex flex-1 flex-col space-y-2.5 px-5 py-4">
                  {category.items.map((item) => (
                    <li key={`${category.title}-${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        className={cn(
                          "text-sm text-zinc-900 transition-colors",
                          "hover:text-[#1a73b5] hover:underline"
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
