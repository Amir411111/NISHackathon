import { create } from "zustand";

import { ACTIVE_CITIZEN_BADGE_THRESHOLD, GAMIFICATION_POINTS_PER_CONFIRMED_REQUEST, SLA_IN_PROGRESS_MINUTES } from "@/constants/sla";
import { MOCK_REQUESTS } from "@/mock/seed";
import { logout as apiLogout, getMe, getStoredSession } from "@/services/authService";
import type { AppUser, Category, Request, RequestLocation, RequestPriority, RequestStatus, UserRole, Worker } from "@/types/domain";
import { createId } from "@/utils/id";

type CreateRequestInput = {
  category: Category;
  description: string;
  priority?: RequestPriority;
  photoUri?: string;
  location?: RequestLocation;
  addressLabel?: string;
};

type AssignInput = {
  requestId: string;
  workerId: string;
};

type AppState = {
  user: AppUser | null;
  authBootstrapped: boolean;

  workers: Worker[];
  requests: Request[];

  citizenPoints: number;

  replaceRequests: (items: Request[]) => void;
  upsertRequest: (item: Request) => void;

  replaceWorkers: (items: Worker[]) => void;

  bootstrapAuth: () => Promise<void>;
  syncMe: () => Promise<void>;

  loginAs: (role: UserRole, opts?: { workerId?: string }) => void;
  logout: () => void;

  createRequest: (input: CreateRequestInput) => string;
  assignWorker: (input: AssignInput) => void;
  startWork: (requestId: string) => void;
  setBeforePhoto: (requestId: string, uri: string | undefined) => void;
  setAfterPhoto: (requestId: string, uri: string | undefined) => void;
  finishWork: (requestId: string) => void;

  citizenConfirmDone: (requestId: string, rating: number) => void;
  citizenSendRework: (requestId: string) => void;

  getRequestById: (id: string) => Request | undefined;
  getWorkerById: (id: string | undefined) => Worker | undefined;

  isRequestOverdue: (r: Request, now?: number) => boolean;
  getActiveCitizenBadge: () => { hasBadge: boolean; threshold: number };

  getAverageClosureMinutes: () => number | null;
};

function pushStatus(r: Request, status: RequestStatus, by: UserRole, at = Date.now()): Request {
  return {
    ...r,
    status,
    statusHistory: [...r.statusHistory, { status, at, by }],
    updatedAt: at,
  };
}

function calcWorkSeconds(r: Request, now = Date.now()): number {
  if (!r.workStartedAt) return 0;
  const end = r.workEndedAt ?? now;
  return Math.max(0, Math.floor((end - r.workStartedAt) / 1000));
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  authBootstrapped: false,

  workers: [],
  requests: MOCK_REQUESTS,

  citizenPoints: 0,

  replaceRequests: (items) => set({ requests: items }),
  replaceWorkers: (items) => set({ workers: items }),
  upsertRequest: (item) =>
    set((s) => {
      const idx = s.requests.findIndex((r) => r.id === item.id);
      if (idx === -1) return { requests: [item, ...s.requests] };
      const next = [...s.requests];
      next[idx] = item;
      return { requests: next };
    }),

  bootstrapAuth: async () => {
    try {
      const session = await getStoredSession();
      if (!session) {
        set({ authBootstrapped: true });
        return;
      }

      set({ user: { role: session.role, workerId: session.workerId }, authBootstrapped: true });

      await get().syncMe();
    } catch {
      set({ authBootstrapped: true });
    }
  },

  syncMe: async () => {
    try {
      const me = await getMe();
      const current = get().user;
      if (!current) return;

      set({
        user: {
          ...current,
          role: me.role,
          id: me.id,
          email: me.email,
          digitalIdKey: me.digitalIdKey,
          ratingAvg: me.ratingAvg,
          ratingCount: me.ratingCount,
        },
        citizenPoints: typeof me.points === "number" ? me.points : get().citizenPoints,
      });
    } catch {
      // ignore
    }
  },

  loginAs: (role, opts) => set({ user: { role, workerId: opts?.workerId } }),
  logout: () => {
    apiLogout().catch(() => {});
    set({ user: null, citizenPoints: 0 });
  },

  createRequest: (input) => {
    const id = createId("req");
    const now = Date.now();

    const priority: RequestPriority = input.priority ?? "MEDIUM";

    const req: Request = {
      id,
      category: input.category,
      description: input.description,
      photoUri: input.photoUri,
      location: input.location,
      addressLabel: input.addressLabel,
      status: "ACCEPTED",
      statusHistory: [{ status: "ACCEPTED", at: now, by: "ADMIN" }],
      createdAt: now,
      updatedAt: now,
      assignedWorkerId: undefined,
      priority,
      reworkCount: 0,
    };

    set((s) => ({ requests: [req, ...s.requests] }));
    return id;
  },

  assignWorker: ({ requestId, workerId }) => {
    set((s) => ({
      requests: s.requests.map((r) => {
        if (r.id !== requestId) return r;
        const updated = pushStatus({ ...r, assignedWorkerId: workerId }, "ASSIGNED", "ADMIN");
        return updated;
      }),
    }));
  },

  startWork: (requestId) => {
    const user = get().user;
    set((s) => ({
      requests: s.requests.map((r) => {
        if (r.id !== requestId) return r;
        if (r.status === "IN_PROGRESS") return r;
        const workerId = user?.role === "WORKER" ? user.workerId : r.assignedWorkerId;
        const updated = pushStatus({ ...r, assignedWorkerId: workerId, workStartedAt: Date.now(), workEndedAt: undefined }, "IN_PROGRESS", "WORKER");
        return updated;
      }),
    }));
  },

  setBeforePhoto: (requestId, uri) => {
    set((s) => ({
      requests: s.requests.map((r) => (r.id === requestId ? { ...r, beforePhotoUri: uri, updatedAt: Date.now() } : r)),
    }));
  },

  setAfterPhoto: (requestId, uri) => {
    set((s) => ({
      requests: s.requests.map((r) => (r.id === requestId ? { ...r, afterPhotoUri: uri, updatedAt: Date.now() } : r)),
    }));
  },

  finishWork: (requestId) => {
    set((s) => ({
      requests: s.requests.map((r) => {
        if (r.id !== requestId) return r;
        if (r.status !== "IN_PROGRESS") return r;
        const now = Date.now();
        const updated = pushStatus({ ...r, workEndedAt: now }, "DONE", "WORKER", now);
        return updated;
      }),
    }));
  },

  citizenConfirmDone: (requestId, rating) => {
    set((s) => ({
      citizenPoints: s.citizenPoints + GAMIFICATION_POINTS_PER_CONFIRMED_REQUEST,
      requests: s.requests.map((r) =>
        r.id === requestId ? { ...r, citizenConfirmedAt: Date.now(), citizenRating: rating, updatedAt: Date.now() } : r
      ),
    }));
  },

  citizenSendRework: (requestId) => {
    set((s) => ({
      requests: s.requests.map((r) => {
        if (r.id !== requestId) return r;
        const now = Date.now();
        const base: Request = {
          ...r,
          reworkCount: r.reworkCount + 1,
          citizenConfirmedAt: undefined,
          workEndedAt: undefined,
        };
        return pushStatus(base, "IN_PROGRESS", "CITIZEN", now);
      }),
    }));
  },

  getRequestById: (id) => get().requests.find((r) => r.id === id),
  getWorkerById: (id) => get().workers.find((w) => w.id === id),

  isRequestOverdue: (r, now = Date.now()) => {
    if (r.status !== "IN_PROGRESS") return false;
    let startedAt = r.workStartedAt;
    if (!startedAt) {
      for (let i = r.statusHistory.length - 1; i >= 0; i--) {
        const h = r.statusHistory[i];
        if (h?.status === "IN_PROGRESS") {
          startedAt = h.at;
          break;
        }
      }
    }
    const effectiveStartedAt = startedAt ?? r.updatedAt;
    const thresholdMs = SLA_IN_PROGRESS_MINUTES * 60 * 1000;
    return now - effectiveStartedAt > thresholdMs;
  },

  getActiveCitizenBadge: () => {
    const points = get().citizenPoints;
    return { hasBadge: points >= ACTIVE_CITIZEN_BADGE_THRESHOLD, threshold: ACTIVE_CITIZEN_BADGE_THRESHOLD };
  },

  getAverageClosureMinutes: () => {
    const confirmed = get().requests.filter((r) => typeof r.citizenConfirmedAt === "number");
    if (confirmed.length === 0) return null;
    const totalMs = confirmed.reduce((sum, r) => sum + ((r.citizenConfirmedAt as number) - r.createdAt), 0);
    return Math.round((totalMs / confirmed.length) / 60000);
  },
}));

export function getWorkSeconds(r: Request, now = Date.now()): number {
  return calcWorkSeconds(r, now);
}
