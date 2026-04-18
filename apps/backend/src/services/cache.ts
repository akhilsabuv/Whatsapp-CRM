import { env } from "../config/env";
import { redis } from "../lib/redis";

type CacheValueFactory<T> = () => Promise<T>;

export async function getOrSetJson<T>(
  key: string,
  factory: CacheValueFactory<T>,
  ttlSeconds = env.REDIS_CACHE_TTL_SECONDS,
) {
  try {
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.error("[cache] read failed", { key, error });
  }

  const value = await factory();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error("[cache] write failed", { key, error });
  }

  return value;
}

export async function invalidateCacheByPrefixes(prefixes: string[]) {
  if (!prefixes.length) {
    return;
  }

  try {
    for (const prefix of prefixes) {
      let cursor = "0";

      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
        cursor = nextCursor;

        if (keys.length) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
    }
  } catch (error) {
    console.error("[cache] invalidate failed", { prefixes, error });
  }
}

export async function invalidateCrmCache() {
  await invalidateCacheByPrefixes([
    "dashboard:",
    "leads:",
    "lead:",
    "users:",
    "transfers:",
  ]);
}
