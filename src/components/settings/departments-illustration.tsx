import { Building2 } from "lucide-react";

export function DepartmentsIllustration() {
  return (
    <div className="relative h-24 w-32 text-[#7eb8e8]">
      <div className="absolute left-1/2 top-0 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-md border-2 border-current bg-[#eef6fc]">
        <Building2 className="h-4 w-4" />
      </div>
      <div className="absolute left-2 top-12 h-9 w-9 rounded-md border-2 border-current bg-[#eef6fc]" />
      <div className="absolute right-2 top-12 h-9 w-9 rounded-md border-2 border-current bg-[#eef6fc]" />
      <div className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[40px] border-t-[14px] border-x-transparent border-t-current opacity-80" />
    </div>
  );
}
