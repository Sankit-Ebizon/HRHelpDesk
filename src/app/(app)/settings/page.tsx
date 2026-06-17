import Link from "next/link";
import { AppHeader } from "@/components/layout/sidebar";
import { PageContent, PageHeader } from "@/components/layout/page-content";
import { getDepartments, getCategories } from "@/lib/queries";
import { getLayoutContext } from "@/components/layout/dashboard-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Tags, Bell, Shield, Layers, ArrowRight, Mail } from "lucide-react";
import { canAccess } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

export default async function SettingsPage() {
  const ctx = await getLayoutContext();
  if (!ctx) return null;
  if (!canAccess(ctx.permissions, "settings", "read")) redirect("/dashboard");
  const [departments, categories] = await Promise.all([
    getDepartments(),
    getCategories(),
  ]);

  const settingsModules = [
    {
      title: "Departments",
      description: `${departments.length} departments configured`,
      href: "/settings/departments",
      icon: Building2,
      color: "from-blue-500/20 to-blue-500/5",
    },
    {
      title: "Categories",
      description: `${categories.length} categories configured`,
      href: "/settings/categories",
      icon: Tags,
      color: "from-violet-500/20 to-violet-500/5",
    },
    {
      title: "Sub-categories",
      description: "Manage ticket sub-categories",
      href: "/settings/subcategories",
      icon: Layers,
      color: "from-purple-500/20 to-purple-500/5",
    },
    {
      title: "Role Permissions",
      description: "Configure access per role and module",
      href: "/settings/permissions",
      icon: Shield,
      roles: ["administrator", "hr_manager"] as UserRole[],
      color: "from-amber-500/20 to-amber-500/5",
    },
    {
      title: "Notifications",
      description: "Configure email notification preferences",
      href: "/settings/notifications",
      icon: Bell,
      color: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      title: "General",
      description: "Manage support inbox and global settings",
      href: "/settings/general",
      icon: Mail,
      roles: ["administrator"] as UserRole[],
      color: "from-cyan-500/20 to-cyan-500/5",
    },
  ];

  return (
    <>
      <AppHeader title="Settings" profile={ctx.profile} />
      <PageContent>
        <PageHeader
          title="Configuration"
          description="Manage your helpdesk structure, permissions, and notification preferences."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsModules
            .filter((mod) => !mod.roles || mod.roles.includes(ctx.profile.role))
            .map((mod, i) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.href} href={mod.href} style={{ animationDelay: `${i * 50}ms` }}>
                  <Card className="group h-full hover-lift cursor-pointer animate-slide-up overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 transition-opacity group-hover:opacity-100`} />
                    <CardHeader className="relative">
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted ring-1 ring-border transition-transform group-hover:scale-105">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </div>
                      <CardTitle className="text-base mt-4">{mod.title}</CardTitle>
                      <CardDescription>{mod.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
        </div>
      </PageContent>
    </>
  );
}
