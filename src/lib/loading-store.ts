type Listener = (loading: boolean) => void;

let loadingCount = 0;
let listeners: Listener[] = [];

function emit() {
  const isLoading = loadingCount > 0;
  for (const listener of listeners) listener(isLoading);
}

export function beginLoading() {
  loadingCount += 1;
  emit();
}

export function endLoading() {
  if (loadingCount > 0) {
    loadingCount -= 1;
  }
  emit();
}

export function resetGlobalLoading() {
  loadingCount = 0;
  emit();
}

export function getGlobalLoading() {
  return loadingCount > 0;
}

export function subscribeGlobalLoading(listener: Listener) {
  listeners.push(listener);
  listener(loadingCount > 0);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** @deprecated Prefer beginLoading/endLoading or runWithLoading. */
export function setGlobalLoading(value: boolean) {
  if (value) {
    beginLoading();
  } else {
    resetGlobalLoading();
  }
}

export async function runWithLoading<T>(fn: () => Promise<T>): Promise<T> {
  beginLoading();
  try {
    return await fn();
  } finally {
    endLoading();
  }
}

export async function runWithLocalLoading<T>(
  setLocalLoading: (loading: boolean) => void,
  fn: () => Promise<T>,
  options?: { global?: boolean }
): Promise<T> {
  setLocalLoading(true);
  if (options?.global) beginLoading();
  try {
    return await fn();
  } finally {
    setLocalLoading(false);
    if (options?.global) endLoading();
  }
}
