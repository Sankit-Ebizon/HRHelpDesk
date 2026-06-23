import Link from "next/link";
import { Info } from "lucide-react";

export function NewDepartmentButton() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/settings/departments/new"
        className="inline-flex h-9 items-center rounded bg-[#1a73b5] px-4 text-sm font-medium text-white transition-colors hover:bg-[#155a8a]"
      >
        New Department
      </Link>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 hover:bg-zinc-50"
        title="Create a department to organize tickets and assign agents"
        aria-label="About new departments"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
