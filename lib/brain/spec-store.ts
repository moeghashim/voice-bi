import type { BusinessUiSpec } from "@/lib/ui/catalog";

// POC-only in-memory store. This is intentionally not durable and must not be
// treated as auth, tenant isolation, or production storage.
const businessUiSpecById = new Map<string, BusinessUiSpec>();

export function setBusinessUiSpec(specId: string, spec: BusinessUiSpec) {
  businessUiSpecById.set(specId, spec);
}

export function getBusinessUiSpec(
  specId: string | null | undefined,
): BusinessUiSpec | null {
  return specId ? (businessUiSpecById.get(specId) ?? null) : null;
}

export function clearBusinessUiSpecStoreForTest() {
  businessUiSpecById.clear();
}
