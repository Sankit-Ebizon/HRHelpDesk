type Listener = (loading: boolean) => void;

let loading = false;
let listeners: Listener[] = [];

function emit() {
  for (const listener of listeners) listener(loading);
}

export function setGlobalLoading(value: boolean) {
  loading = value;
  emit();
}

export function resetGlobalLoading() {
  loading = false;
  emit();
}

export function getGlobalLoading() {
  return loading;
}

export function subscribeGlobalLoading(listener: Listener) {
  listeners.push(listener);
  listener(loading);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export async function runWithLoading<T>(fn: () => Promise<T>): Promise<T> {
  setGlobalLoading(true);
  try {
    return await fn();
  } finally {
    setGlobalLoading(false);
  }
}
