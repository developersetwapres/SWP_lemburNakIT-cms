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

export function lockDialogActions(close: () => void, confirm: () => void) {
  return { cancel: close, confirm };
}
