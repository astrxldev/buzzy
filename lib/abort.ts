export function registerAbortCleanup(
  signal: AbortSignal | undefined,
  cleanup: () => void,
) {
  if (!signal) return () => {};
  if (signal.aborted) {
    cleanup();
    return () => {};
  }
  signal.addEventListener("abort", cleanup, { once: true });
  return () => signal.removeEventListener("abort", cleanup);
}
