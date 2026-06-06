import type { BusinessUiSpec } from "@/lib/ui/catalog";

type TranscriptRecord = { text: string; specIds: string[] };
type SpecStoreState = {
  businessUiSpecById: Map<string, BusinessUiSpec>;
  businessUiSpecIdsBySessionId: Map<string, string[]>;
  transcriptBySessionId: Map<string, TranscriptRecord>;
};

declare global {
  var __voiceBiSpecStore: SpecStoreState | undefined;
}

// POC-only in-memory store. This is intentionally not durable and must not be
// treated as auth, tenant isolation, or production storage.
const specStore: SpecStoreState = (globalThis.__voiceBiSpecStore ??= {
  businessUiSpecById: new Map<string, BusinessUiSpec>(),
  businessUiSpecIdsBySessionId: new Map<string, string[]>(),
  transcriptBySessionId: new Map<string, TranscriptRecord>(),
});
const {
  businessUiSpecById,
  businessUiSpecIdsBySessionId,
  transcriptBySessionId,
} = specStore;

export function setBusinessUiSpec(
  specId: string,
  spec: BusinessUiSpec,
  options: { sessionId?: string | null } = {},
) {
  businessUiSpecById.set(specId, spec);

  if (options.sessionId) {
    linkBusinessUiSpecToSession(options.sessionId, specId);
  }
}

export function getBusinessUiSpec(
  specId: string | null | undefined,
): BusinessUiSpec | null {
  return specId ? (businessUiSpecById.get(specId) ?? null) : null;
}

export function linkBusinessUiSpecToSession(
  sessionId: string,
  specId: string,
) {
  const existingSpecIds = businessUiSpecIdsBySessionId.get(sessionId) ?? [];

  if (existingSpecIds.includes(specId)) {
    return;
  }

  businessUiSpecIdsBySessionId.set(sessionId, [...existingSpecIds, specId]);
}

export function getBusinessUiSpecIdsForSession(
  sessionId: string | null | undefined,
) {
  return sessionId
    ? [...(businessUiSpecIdsBySessionId.get(sessionId) ?? [])]
    : [];
}

export function setTranscriptForSession(sessionId: string, text: string) {
  const transcript = {
    text,
    specIds: getBusinessUiSpecIdsForSession(sessionId),
  };

  transcriptBySessionId.set(sessionId, transcript);

  return transcript;
}

export function getTranscriptForSession(
  sessionId: string | null | undefined,
) {
  return sessionId ? (transcriptBySessionId.get(sessionId) ?? null) : null;
}

export function clearBusinessUiSpecStoreForTest() {
  businessUiSpecById.clear();
  businessUiSpecIdsBySessionId.clear();
  transcriptBySessionId.clear();
}
