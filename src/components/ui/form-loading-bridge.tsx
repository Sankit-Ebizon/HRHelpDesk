"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { setGlobalLoading } from "@/lib/loading-store";

/** Syncs native server-action form pending state to the global loader. Place inside <form>. */
export function FormLoadingBridge() {
  const { pending } = useFormStatus();

  useEffect(() => {
    setGlobalLoading(pending);
  }, [pending]);

  return null;
}
