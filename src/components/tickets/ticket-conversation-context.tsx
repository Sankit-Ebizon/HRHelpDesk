"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type ComposerMode =
  | null
  | { type: "reply" | "replyAll" | "forward"; messageId?: string; draftId?: string }
  | { type: "internal" };

export interface TicketHeaderCallbacks {
  onEdit?: () => void;
  onPrint?: () => void;
}

interface TicketConversationContextValue {
  composerMode: ComposerMode;
  openComposer: (mode: NonNullable<ComposerMode>) => void;
  closeComposer: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  registerHeaderCallbacks: (callbacks: TicketHeaderCallbacks) => void;
  getHeaderCallbacks: () => TicketHeaderCallbacks;
}

const TicketConversationContext = createContext<TicketConversationContextValue | null>(null);

export function TicketConversationProvider({ children }: { children: ReactNode }) {
  const [composerMode, setComposerMode] = useState<ComposerMode>(null);
  const [activeTab, setActiveTab] = useState("conversation");
  const headerCallbacksRef = useRef<TicketHeaderCallbacks>({});

  const openComposer = useCallback((mode: NonNullable<ComposerMode>) => {
    setComposerMode(mode);
    setActiveTab("conversation");
  }, []);

  const closeComposer = useCallback(() => {
    setComposerMode(null);
  }, []);

  const registerHeaderCallbacks = useCallback((callbacks: TicketHeaderCallbacks) => {
    headerCallbacksRef.current = callbacks;
  }, []);

  const getHeaderCallbacks = useCallback(() => headerCallbacksRef.current, []);

  return (
    <TicketConversationContext.Provider
      value={{
        composerMode,
        openComposer,
        closeComposer,
        activeTab,
        setActiveTab,
        registerHeaderCallbacks,
        getHeaderCallbacks,
      }}
    >
      {children}
    </TicketConversationContext.Provider>
  );
}

export function useTicketConversation() {
  const context = useContext(TicketConversationContext);
  if (!context) {
    throw new Error("useTicketConversation must be used within TicketConversationProvider");
  }
  return context;
}
