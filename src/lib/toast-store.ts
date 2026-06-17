export type ToastVariant = "default" | "success" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

export type ToastItem = ToastInput & {
  id: string;
  createdAt: number;
  durationMs: number;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listeners: Listener[] = [];

function emit() {
  for (const listener of listeners) listener(toasts);
}

function makeId() {
  // Use a reasonably unique id for client-side toast items.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(input: ToastInput) {
  const id = makeId();
  const item: ToastItem = {
    id,
    createdAt: Date.now(),
    variant: input.variant ?? "default",
    durationMs: input.durationMs ?? 4000,
    title: input.title,
    description: input.description,
  };

  toasts = [item, ...toasts].slice(0, 4);
  emit();

  if (item.durationMs > 0) {
    window.setTimeout(() => dismissToast(id), item.durationMs);
  }

  return id;
}

export function useToastStoreSubscribe(listener: Listener) {
  listeners.push(listener);
  listener(toasts);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getToasts() {
  return toasts;
}

