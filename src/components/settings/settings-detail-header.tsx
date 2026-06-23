import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface SettingsDetailHeaderProps {
  category: string;
  title: string;
  breadcrumbLabel?: string;
  description: string;
  learnMoreHref?: string;
  illustration?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SettingsDetailHeader({
  category,
  title,
  breadcrumbLabel,
  description,
  learnMoreHref,
  illustration,
  actions,
}: SettingsDetailHeaderProps) {
  const crumbLabel = breadcrumbLabel ?? title;
  return (
    <div className="border-b border-zinc-200 px-6 py-4 sm:px-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <nav className="text-sm text-zinc-500">
          <Link href="/settings" className="text-[#1a73b5] hover:underline">
            {category}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-zinc-700">{crumbLabel}</span>
        </nav>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className="flex items-start justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="text-lg font-bold uppercase tracking-wide text-zinc-900">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{description}</p>
          {learnMoreHref && (
            <Link
              href={learnMoreHref}
              className="mt-2 inline-flex items-center gap-1 text-sm text-[#1a73b5] hover:underline"
            >
              Learn More
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {illustration && <div className="hidden shrink-0 sm:block">{illustration}</div>}
      </div>
    </div>
  );
}
