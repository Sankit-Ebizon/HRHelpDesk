"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { beginLoading, endLoading } from "@/lib/loading-store";

/** Syncs native server-action form pending state to the global loader. Place inside <form>. */
export function FormLoadingBridge() {
  const { pending } = useFormStatus();
  const activeRef = useRef(false);

  useEffect(() => {
    if (pending && !activeRef.current) {
      beginLoading();
      activeRef.current = true;
    } else if (!pending && activeRef.current) {
      endLoading();
      activeRef.current = false;
    }
  }, [pending]);

  useEffect(() => {
    return () => {
      if (activeRef.current) {
        endLoading();
        activeRef.current = false;
      }
    };
  }, []);

  return null;
}
