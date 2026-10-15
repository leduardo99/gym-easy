export const RED_FLAG_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type RedFlagLock = {
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  clearedAt: Date | null;
};

export interface RedFlagLockStore {
  get(userId: string): Promise<RedFlagLock | null>;
  start(userId: string, now: Date): Promise<RedFlagLock>;
  clear(userId: string, now: Date): Promise<void>;
}

export function isCooldownActive(lock: RedFlagLock | null, now: Date): boolean {
  if (!lock || lock.clearedAt) return false;
  return lock.expiresAt.getTime() > now.getTime();
}

export function createMemoryRedFlagLockStore(): RedFlagLockStore {
  const locks = new Map<string, RedFlagLock>();
  return {
    async get(userId) {
      return locks.get(userId) ?? null;
    },
    async start(userId, now) {
      const lock: RedFlagLock = {
        userId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + RED_FLAG_COOLDOWN_MS),
        clearedAt: null,
      };
      locks.set(userId, lock);
      return lock;
    },
    async clear(userId, now) {
      const current = locks.get(userId);
      if (!current) return;
      locks.set(userId, { ...current, clearedAt: now });
    },
  };
}
