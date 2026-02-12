import { apiClient } from "@/api/client";
import type { Category, Request, RequestLocation, RequestPriority, RequestStatus, UserRole } from "@/types/domain";
import { Platform } from "react-native";

type BackendPriority = "low" | "medium" | "high";

type RequestDto = {
  id: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  priority: BackendPriority;
  location: { lat: number; lng: number };
  photosBefore: string[];
  photosAfter: string[];
  status: RequestStatus;
  statusHistory: Array<{ status: RequestStatus; at: string; by: "citizen" | "worker" | "admin" }>;
  citizenId: string;
  workerId: string | null;
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string | null;
  isOverdue: boolean;
  workStartedAt?: string | null;
  workEndedAt?: string | null;
  citizenConfirmedAt?: string | null;
  citizenRating?: number | null;
  adminRejectedAt?: string | null;
  adminPenaltyPoints?: number | null;
  reworkCount: number;
};

function categoryToBackendName(category: Category): string {
  if (category === "LIGHTING") return "Свет";
  if (category === "TRASH") return "Мусор";
  return "Дорога";
}

function priorityToBackend(p: RequestPriority): BackendPriority {
  if (p === "HIGH") return "high";
  if (p === "LOW") return "low";
  return "medium";
}

function priorityFromBackend(p: BackendPriority): RequestPriority {
  if (p === "high") return "HIGH";
  if (p === "low") return "LOW";
  return "MEDIUM";
}

function roleFromBackend(by: "citizen" | "worker" | "admin"): UserRole {
  if (by === "citizen") return "CITIZEN";
  if (by === "worker") return "WORKER";
  return "ADMIN";
}

function categoryFromBackendName(name?: string): Category {
  if (name === "Свет") return "LIGHTING";
  if (name === "Мусор") return "TRASH";
  return "ROAD";
}

function mapDto(dto: RequestDto): Request {
  return {
    id: dto.id,
    category: categoryFromBackendName(dto.categoryName),
    description: dto.description,
    photoUri: dto.photosBefore[0],
    beforePhotoUri: dto.photosBefore[0],
    afterPhotoUri: dto.photosAfter[0],
    location: dto.location ? { lat: dto.location.lat, lon: dto.location.lng, accuracy: undefined } : undefined,
    addressLabel: undefined,
    status: dto.status,
    statusHistory: (dto.statusHistory || []).map((h) => ({ status: h.status, at: new Date(h.at).getTime(), by: roleFromBackend(h.by) })),
    createdAt: new Date(dto.createdAt).getTime(),
    updatedAt: new Date(dto.updatedAt).getTime(),
    slaDeadline: dto.slaDeadline ? new Date(dto.slaDeadline).getTime() : undefined,
    assignedWorkerId: dto.workerId ?? undefined,
    priority: priorityFromBackend(dto.priority),
    reworkCount: dto.reworkCount ?? 0,
    citizenConfirmedAt: dto.citizenConfirmedAt ? new Date(dto.citizenConfirmedAt).getTime() : undefined,
    citizenRating: typeof dto.citizenRating === "number" ? dto.citizenRating : undefined,
    adminRejectedAt: dto.adminRejectedAt ? new Date(dto.adminRejectedAt).getTime() : undefined,
    adminPenaltyPoints: typeof dto.adminPenaltyPoints === "number" ? dto.adminPenaltyPoints : undefined,
    workStartedAt: dto.workStartedAt ? new Date(dto.workStartedAt).getTime() : undefined,
    workEndedAt: dto.workEndedAt ? new Date(dto.workEndedAt).getTime() : undefined,
  };
}

function inferFilename(uri: string) {
  // blob:... or data:... may not contain a real filename
  const last = uri.split("/").pop();
  if (!last || last.startsWith("blob:") || last.startsWith("data:")) return "photo.jpg";
  return last.includes(".") ? last : `${last}.jpg`;
}

async function appendFile(form: FormData, field: string, uri: string) {
  const filename = inferFilename(uri);
  const ext = filename.split(".").pop()?.toLowerCase();
  const fallbackType = ext === "png" ? "image/png" : "image/jpeg";

  if (Platform.OS === "web") {
    // Browser FormData expects Blob/File.
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const typedBlob = blob.type ? blob : new Blob([blob], { type: fallbackType });
    form.append(field, typedBlob, filename);
    return;
  }

  // React Native FormData accepts { uri, name, type } objects.
  form.append(field, { uri, name: filename, type: fallbackType } as any);
}

export async function createRequest(input: {
  category: Category;
  description: string;
  priority: RequestPriority;
  location: RequestLocation;
  photoUri?: string;
}): Promise<Request> {
  const form = new FormData();
  form.append("category", categoryToBackendName(input.category));
  form.append("description", input.description);
  form.append("priority", priorityToBackend(input.priority));
  form.append("lat", String(input.location.lat));
  form.append("lng", String(input.location.lon));

  if (input.photoUri && !input.photoUri.startsWith("mock://")) {
    await appendFile(form, "before", input.photoUri);
  }

  const res = await apiClient.post<{ item: RequestDto }>(
    "/requests",
    form,
    Platform.OS === "web" ? undefined : { headers: { "Content-Type": "multipart/form-data" } }
  );

  return mapDto(res.data.item);
}

export async function getMyRequests(): Promise<Request[]> {
  const res = await apiClient.get<{ items: RequestDto[] }>("/requests/my");
  return res.data.items.map(mapDto);
}

export async function citizenConfirm(id: string, rating: number): Promise<Request> {
  const res = await apiClient.post<{ item: RequestDto }>(`/requests/${id}/confirm`, { rating });
  return mapDto(res.data.item);
}

export async function citizenReject(id: string): Promise<Request> {
  const res = await apiClient.post<{ item: RequestDto }>(`/requests/${id}/reject`);
  return mapDto(res.data.item);
}

// Worker
export async function getTasks(): Promise<Request[]> {
  const res = await apiClient.get<{ items: RequestDto[] }>("/tasks");
  return res.data.items.map(mapDto);
}

export async function startTask(id: string): Promise<Request> {
  const res = await apiClient.post<{ item: RequestDto }>(`/tasks/${id}/start`);
  return mapDto(res.data.item);
}

export async function completeTask(id: string, afterPhotoUri: string): Promise<Request> {
  const form = new FormData();
  if (!afterPhotoUri.startsWith("mock://")) {
    await appendFile(form, "after", afterPhotoUri);
  }
  const res = await apiClient.post<{ item: RequestDto }>(
    `/tasks/${id}/complete`,
    form,
    Platform.OS === "web" ? undefined : { headers: { "Content-Type": "multipart/form-data" } }
  );
  return mapDto(res.data.item);
}

// Admin
export async function adminListAll(): Promise<Request[]> {
  const res = await apiClient.get<{ items: RequestDto[] }>("/requests");
  return res.data.items.map(mapDto);
}

export async function adminAssign(requestId: string, workerId: string, deadlineHours: number): Promise<Request> {
  const res = await apiClient.post<{ item: RequestDto }>(`/requests/${requestId}/assign`, { workerId, deadlineHours });
  return mapDto(res.data.item);
}

export async function adminReject(requestId: string, penaltyPoints: number): Promise<Request> {
  const res = await apiClient.post<{ item: RequestDto }>(`/requests/${requestId}/admin-reject`, { penaltyPoints });
  return mapDto(res.data.item);
}

export async function analyticsSummary(): Promise<{ total: number; overdue: number; byStatus: Record<string, number>; avgCloseMinutes: number | null }> {
  const res = await apiClient.get<{ total: number; overdue: number; byStatus: Record<string, number>; avgCloseMinutes: number | null }>("/analytics/summary");
  return res.data;
}
