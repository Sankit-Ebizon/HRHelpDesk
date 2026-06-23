import Link from "next/link";
import type { RoleDefinition } from "@/types";

const PROFILE_DESCRIPTIONS: Record<string, string> = {
  administrator: "By default, the administrator role has full access to all modules.",
  hr_manager: "Set the privileges for HR managers.",
  hr_agent: "Set the privileges for HR agents.",
};

function profileDescription(role: RoleDefinition) {
  return PROFILE_DESCRIPTIONS[role.role] ?? `Set the privileges for ${role.label.toLowerCase()}.`;
}

function ProfileGroup({
  title,
  roles,
}: {
  title: string;
  roles: RoleDefinition[];
}) {
  if (roles.length === 0) return null;

  return (
    <section className="border-b border-zinc-200 last:border-b-0">
      <h2 className="px-6 py-3 text-sm font-semibold text-zinc-800 sm:px-8">
        {title} ({roles.length})
      </h2>
      <ul>
        {roles.map((role) => (
          <li key={role.role} className="border-t border-zinc-100 first:border-t-0">
            <Link
              href={`/settings/permissions/${role.role}`}
              className="block px-6 py-4 transition-colors hover:bg-[#f8fbff] sm:px-8"
            >
              <p className="text-[15px] font-medium text-[#1a73b5]">{role.label}</p>
              <p className="mt-1 text-[13px] text-zinc-600">{profileDescription(role)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ProfilesListViewProps {
  roles: RoleDefinition[];
}

export function ProfilesListView({ roles }: ProfilesListViewProps) {
  const systemRoles = roles.filter((role) => role.is_system);
  const customRoles = roles.filter((role) => !role.is_system);

  return (
    <div className="bg-white">
      <ProfileGroup title="Default Profiles" roles={systemRoles} />
      <ProfileGroup title="Custom Profiles" roles={customRoles} />
      {/* {customRoles.length === 0 && (
        <section className="border-t border-zinc-200">
          <h2 className="px-6 py-3 text-sm font-semibold text-zinc-800 sm:px-8">
            Custom Profiles (0)
          </h2>
          <p className="px-6 pb-6 text-[13px] text-zinc-500 sm:px-8">
            No custom profiles yet. Create one to define a new permission set.
          </p>
        </section>
      )} */}
    </div>
  );
}
