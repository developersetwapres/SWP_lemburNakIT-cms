export type BusyRef = { current: boolean };

export async function runOnce<T>(busy: BusyRef, operation: () => Promise<T>) {
  if (busy.current) return undefined;
  busy.current = true;
  try {
    return await operation();
  } finally {
    busy.current = false;
  }
}

export function createRunOnce() {
  let busy = false;
  return async function run<T>(operation: () => Promise<T>) {
    if (busy) return undefined;
    busy = true;
    try { return await operation(); }
    finally { busy = false; }
  };
}

export function lockDialogActions(close: () => void, confirm: () => void) {
  return { cancel: close, confirm };
}
