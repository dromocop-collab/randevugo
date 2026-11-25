"use client";

// İstek & öneri panosu — veri katmanı. Okuma Firestore'dan (kurallar: yayındakiler herkese, kendi isteği yazarına),
// yazma yalnız callable'larla (submitFeatureRequest, voteFeatureRequest).
import { useEffect, useState } from "react";
import { collection, doc, limit, onSnapshot, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { toFeatureRequest, type FeatureKind, type FeatureRequest } from "./feature-request-domain";

const fn = <I, O>(name: string) => httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);

export type SubmitInput = { title: string; details: string; kind: FeatureKind; name?: string; contact?: string; businessId?: string | null; page?: string; website?: string };

export async function submitFeatureRequest(input: SubmitInput): Promise<string> {
  const result = await fn<SubmitInput, { id: string }>("submitFeatureRequest")(input);
  return result.data.id;
}

export async function voteFeatureRequest(requestId: string): Promise<{ voted: boolean; votes: number }> {
  const result = await fn<{ requestId: string }, { voted: boolean; votes: number }>("voteFeatureRequest")({ requestId });
  return result.data;
}

/** Panodaki (yayında) istekler; null = yükleniyor. */
export function usePublicFeatureRequests(): { rows: FeatureRequest[] | null; error: string | null } {
  const [state, setState] = useState<{ rows: FeatureRequest[] | null; error: string | null }>({ rows: null, error: null });
  useEffect(() => onSnapshot(
    query(collection(getDb(), "featureRequests"), where("public", "==", true), limit(400)),
    (snapshot) => setState({ rows: snapshot.docs.map((item) => toFeatureRequest(item.id, item.data())), error: null }),
    (error) => setState({ rows: [], error: error.message }),
  ), []);
  return state;
}

/** Kullanıcının kendi istekleri (yayında olmayanlar dahil). */
export function useMyFeatureRequests(uid: string | null): FeatureRequest[] | null {
  const [state, setState] = useState<{ uid: string | null; rows: FeatureRequest[] | null }>({ uid: null, rows: null });
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(getDb(), "featureRequests"), where("authorUid", "==", uid), limit(100)),
      (snapshot) => setState({ uid, rows: snapshot.docs.map((item) => toFeatureRequest(item.id, item.data())) }),
      () => setState({ uid, rows: [] }),
    );
  }, [uid]);
  if (!uid) return [];
  return state.uid === uid ? state.rows : null;
}

/** Kullanıcının oy verdiği istek kimlikleri. */
export function useMyVotes(uid: string | null): Set<string> {
  const [state, setState] = useState<{ uid: string | null; ids: Set<string> }>({ uid: null, ids: new Set() });
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(getDb(), "featureRequestVotes", uid),
      (snapshot) => setState({ uid, ids: new Set(Array.isArray(snapshot.data()?.ids) ? snapshot.data()!.ids as string[] : []) }),
      () => setState({ uid, ids: new Set() }),
    );
  }, [uid]);
  return uid && state.uid === uid ? state.ids : new Set();
}
