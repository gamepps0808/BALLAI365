/**
 * In-memory TTL cache (per server process).
 *
 * Keeps API usage inside free-tier rate limits: identical calls within the
 * TTL window hit memory instead of the provider. Swap for Redis by replacing
 * this module — callers only use `cached()`.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  // De-duplicate concurrent requests for the same key.
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fn()
    .then((value) => {
      // ไม่ cache null/undefined — ผลที่ล้มเหลว (เช่น Claude validate ไม่ผ่าน)
      // ไม่ควรค้างใน cache แล้วบล็อกการลองใหม่ตลอด TTL
      if (value != null) {
        store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      }
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

/** อ่านค่าตรงๆ (ไม่มี loader) — ใช้คู่กับ cachePut เมื่อ TTL ขึ้นกับผลลัพธ์ */
export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  return undefined;
}

export function cachePut(key: string, value: unknown, ttlSeconds: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function invalidate(prefix?: string): number {
  if (!prefix) {
    const n = store.size;
    store.clear();
    return n;
  }
  let n = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      n++;
    }
  }
  return n;
}

/** จำนวนรายการที่ยังไม่หมดอายุ — แสดงใน Admin panel */
export function cacheSize(): number {
  const now = Date.now();
  let n = 0;
  for (const e of store.values()) if (e.expiresAt > now) n++;
  return n;
}
