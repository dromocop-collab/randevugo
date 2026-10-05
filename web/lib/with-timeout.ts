/** Sunucuda Firestore'a ulaşılamazsa istemci SDK'sı uzun süre yeniden dener; sayfa sonsuza dek beklemesin. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = "işlem"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} ${ms} ms içinde tamamlanmadı`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
