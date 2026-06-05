import type { NormalizedData } from "./normalize";

// POC-only in-memory store. This is intentionally not durable and must not be
// treated as auth, tenant isolation, or production storage.
const normalizedDataBySessionId = new Map<string, NormalizedData>();

export function setNormalizedDataForSession(
  sessionId: string,
  data: NormalizedData,
) {
  normalizedDataBySessionId.set(sessionId, data);
}

export function getNormalizedDataForSession(
  sessionId: string | null | undefined,
): NormalizedData | null {
  return sessionId ? (normalizedDataBySessionId.get(sessionId) ?? null) : null;
}
