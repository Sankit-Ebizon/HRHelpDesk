"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OwnerMultiSelectProps {
  agents: { id: string; full_name: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
}

export function OwnerMultiSelect({ agents, value, onChange, id }: OwnerMultiSelectProps) {
  function toggle(agentId: string) {
    onChange(
      value.includes(agentId) ? value.filter((id) => id !== agentId) : [...value, agentId]
    );
  }

  const label =
    value.length === 0
      ? "All Owners"
      : value.length === 1
        ? agents.find((agent) => agent.id === value[0])?.full_name ?? "1 owner"
        : `${value.length} owners selected`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-8 w-full justify-between px-3 font-normal text-[#222]"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#555]" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 max-h-64 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-md border border-border bg-white p-1 shadow-md"
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
            onSelect={(event) => {
              event.preventDefault();
              onChange([]);
            }}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#ccc]",
                value.length === 0 && "border-[#1a73b5] bg-[#1a73b5] text-white"
              )}
            >
              {value.length === 0 && <Check className="h-3 w-3" />}
            </span>
            All Owners
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {agents.map((agent) => {
            const selected = value.includes(agent.id);
            return (
              <DropdownMenu.Item
                key={agent.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[#222] outline-none hover:bg-[#f5f7f9] focus:bg-[#f5f7f9]"
                onSelect={(event) => {
                  event.preventDefault();
                  toggle(agent.id);
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
                {agent.full_name}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
