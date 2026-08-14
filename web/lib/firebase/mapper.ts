import { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";

function toIso(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toIso);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, inner]) => {
      out[key] = toIso(inner);
    });
    return out;
  }
  return value;
}

export function mapDoc<T>(
  snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>
): T {
  const data = toIso(snapshot.data()) as unknown as T;
  return {
    id: snapshot.id,
    ...(data as object),
  } as T;
}
