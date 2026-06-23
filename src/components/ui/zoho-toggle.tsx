"use client";

import { cn } from "@/lib/utils";

interface ZohoToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  label: string;
  disabled?: boolean;
}

export function ZohoToggle({ checked, onChange, id, label, disabled }: ZohoToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 rounded-full transition-colors",
        checked ? "bg-[#3dcc7e]" : "bg-zinc-300",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[17px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
