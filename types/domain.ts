export type UserRole = "CITIZEN" | "WORKER" | "ADMIN";

export type Category = "LIGHTING" | "TRASH" | "ROAD";

export type RequestStatus = "ACCEPTED" | "ASSIGNED" | "IN_PROGRESS" | "DONE";

export type SLAStatus = "OK" | "OVERDUE";

export type Worker = {
  id: string;
  name: string;
  contractorName: string;
  rating: number; // 0..5
  ratingCount?: number;
};

export type AppUser = {
  role: UserRole;
  workerId?: string;
  id?: string;
  fullName?: string;
  email?: string;
  points?: number;
  digitalIdKey?: string;
  ratingAvg?: number;
  ratingCount?: number;
};

export type RequestPriority = "LOW" | "MEDIUM" | "HIGH";

export type RequestLocation = {
  lat: number;
  lon: number;
  accuracy?: number;
};

export type StatusHistoryItem = {
  status: RequestStatus;
  at: number; // epoch ms
  by: UserRole;
};

export type Request = {
  id: string;
  category: Category;
  description: string;

  photoUri?: string; // citizen-reported photo
  location?: RequestLocation;
  addressLabel?: string;

  status: RequestStatus;
  statusHistory: StatusHistoryItem[];

  createdAt: number;
  updatedAt: number;

  assignedWorkerId?: string;
  priority: RequestPriority;

  reworkCount: number;
  citizenConfirmedAt?: number;
  citizenRating?: number;

  workStartedAt?: number;
  workEndedAt?: number;
  beforePhotoUri?: string;
  afterPhotoUri?: string;
};
