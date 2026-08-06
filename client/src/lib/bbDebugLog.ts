// #region agent log
/** Temporary debug instrumentation for the live preview iframe (session cb36fc). Remove when done. */
export function bbDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  try {
    console.log(`[BB-DEBUG cb36fc][${hypothesisId}] ${message}`, data);
  } catch {
    // ignore
  }
  // The collector only exists on the developer's machine; skip it on staging/prod to avoid console noise.
  const local =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (!local) return;
  try {
    fetch("http://127.0.0.1:7454/ingest/babef855-2138-46ca-93cf-7acd45e00ee4", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cb36fc" },
      body: JSON.stringify({
        sessionId: "cb36fc",
        runId: "run1",
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
// #endregion
