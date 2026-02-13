import { apiClient } from "@/api/client";
import type { UserRole } from "@/types/domain";
import axios from "axios";

type BackendRole = "citizen" | "worker" | "admin";

function roleFromBackend(role: BackendRole): UserRole {
  if (role === "citizen") return "CITIZEN";
  if (role === "worker") return "WORKER";
  return "ADMIN";
}

function roleToBackend(role: UserRole): BackendRole {
  if (role === "CITIZEN") return "citizen";
  if (role === "WORKER") return "worker";
  return "admin";
}

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  points: number;
  digitalIdKey?: string;
  ratingAvg?: number;
  ratingCount?: number;
  createdAt?: string;
  rank: number;
};

export type UserStats = {
  requestsCreated: number;
  requestsConfirmed: number;
  requestsActive: number;
  tasksCompleted: number;
  avgCloseMinutes: number | null;
  activity: Array<{ date: string; count: number }>;
};

type ProfileResponse = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: BackendRole;
    points: number;
    digitalIdKey?: string;
    ratingAvg?: number;
    ratingCount?: number;
    createdAt?: string;
    rank: number;
  };
  stats?: UserStats;
};

export async function getMyProfile(): Promise<{ user: UserProfile; stats: UserStats }> {
  const res = await apiClient.get<ProfileResponse>("/users/me");
  return {
    user: {
      id: res.data.user.id,
      fullName: res.data.user.fullName,
      email: res.data.user.email,
      role: roleFromBackend(res.data.user.role),
      points: res.data.user.points,
      digitalIdKey: res.data.user.digitalIdKey,
      ratingAvg: res.data.user.ratingAvg,
      ratingCount: res.data.user.ratingCount,
      createdAt: res.data.user.createdAt,
      rank: res.data.user.rank,
    },
    stats: res.data.stats || {
      requestsCreated: 0,
      requestsConfirmed: 0,
      requestsActive: 0,
      tasksCompleted: 0,
      avgCloseMinutes: null,
      activity: [],
    },
  };
}

export async function updateMyProfile(fullName: string): Promise<UserProfile> {
  const res = await apiClient.patch<ProfileResponse>("/users/me", { fullName });
  return {
    id: res.data.user.id,
    fullName: res.data.user.fullName,
    email: res.data.user.email,
    role: roleFromBackend(res.data.user.role),
    points: res.data.user.points,
    digitalIdKey: res.data.user.digitalIdKey,
    ratingAvg: res.data.user.ratingAvg,
    ratingCount: res.data.user.ratingCount,
    createdAt: res.data.user.createdAt,
    rank: res.data.user.rank,
  };
}

export async function changeMyPassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiClient.post("/users/change-password", {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  });
}

export type LeaderboardItem = {
  rank: number;
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  points: number;
  ratingAvg?: number;
  ratingCount?: number;
};

const publicApiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
});

export async function getLeaderboard(limit = 20, role?: UserRole): Promise<{ items: LeaderboardItem[]; meRank: number | null }> {
  const res = await apiClient.get<{ items: Array<{ rank: number; id: string; fullName: string; email: string; role: BackendRole; points: number; ratingAvg?: number; ratingCount?: number }>; meRank: number | null }>(
    "/users/leaderboard",
    { params: { role: role ? roleToBackend(role) : undefined, limit } }
  );

  return {
    meRank: res.data.meRank,
    items: res.data.items.map((item) => ({
      rank: item.rank,
      id: item.id,
      fullName: item.fullName,
      email: item.email,
      role: roleFromBackend(item.role),
      points: item.points,
      ratingAvg: item.ratingAvg,
      ratingCount: item.ratingCount,
    })),
  };
}

export async function getPublicLeaderboard(limit = 20, role?: UserRole): Promise<{ items: LeaderboardItem[]; meRank: number | null }> {
  const res = await publicApiClient.get<{ items: Array<{ rank: number; id: string; fullName: string; email: string; role: BackendRole; points: number; ratingAvg?: number; ratingCount?: number }>; meRank: number | null }>(
    "/public/leaderboard",
    { params: { role: role ? roleToBackend(role) : undefined, limit } }
  );

  return {
    meRank: res.data.meRank,
    items: res.data.items.map((item) => ({
      rank: item.rank,
      id: item.id,
      fullName: item.fullName,
      email: item.email,
      role: roleFromBackend(item.role),
      points: item.points,
      ratingAvg: item.ratingAvg,
      ratingCount: item.ratingCount,
    })),
  };
}
