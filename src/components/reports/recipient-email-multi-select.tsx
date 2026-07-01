"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RecipientOption {
  email: string;
  label: string;
}

interface RecipientEmailMultiSelectProps {
  options: RecipientOption[];
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
}

export function RecipientEmailMultiSelect({
  options,
  value,
  onChange,
  id,
}: RecipientEmailMultiSelectProps) {
  function toggle(email: string) {
    const normalized = email.toLowerCase();
    onChange(
      value.includes(normalized)
        ? value.filter((entry) => entry !== normalized)
        : [...value, normalized]
    );
  }

  const label =
    value.length === 0
      ? "Select recipients..."
      : value.length === 1
        ? options.find((opt) => opt.email === value[0])?.label ?? value[0]
        : `${value.length} recipients selected`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-auto min-h-8 w-full justify-between px-3 py-2 font-normal text-[#222]"
        >
          <span className="truncate text-left">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#555]" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-md border border-border bg-white p-1 shadow-md"
        >
          {options.length === 0 ? (
            <p className="px-2 py-2 text-[13px] text-muted-foreground">No users available.</p>
          ) : (
            options.map((option) => {
              const selected = value.includes(option.email.toLowerCase());
              return (
                <DropdownMenu.Item
                  key={option.email}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                  onSelect={(event) => {
                    event.preventDefault();
                    toggle(option.email);
                  }}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#ccc]",
                      selected && "border-[#1a73b5] bg-[#1a73b5] text-white"
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-[11px] text-muted-foreground">{option.email}</span>
                  </span>
                </DropdownMenu.Item>
              );
            })
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
