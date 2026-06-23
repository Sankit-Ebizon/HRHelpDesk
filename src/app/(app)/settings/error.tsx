"use client";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
      <p className="max-w-md text-sm text-zinc-600">
        {error.message || "The settings page failed to load."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-[#1a73b5] px-4 py-2 text-sm font-medium text-white hover:bg-[#155a8a]"
      >
        Try again
      </button>
    </div>
  );
}
