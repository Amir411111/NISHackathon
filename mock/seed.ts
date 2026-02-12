import type { Request, Worker } from "@/types/domain";

export const MOCK_WORKERS: Worker[] = [
  { id: "w1", name: "Айдос С.", contractorName: "ТОО UrbanFix", rating: 4.6 },
  { id: "w2", name: "Диана К.", contractorName: "ТОО EcoService", rating: 4.2 },
  { id: "w3", name: "Ерлан Т.", contractorName: "ТОО RoadPro", rating: 4.8 },
];

const now = Date.now();

export const MOCK_REQUESTS: Request[] = [
  {
    id: "r1",
    category: "LIGHTING",
    description: "Не горит фонарь у подъезда, темно вечером.",
    photoUri: undefined,
    location: { lat: 43.238949, lon: 76.889709, accuracy: 25 },
    addressLabel: "ул. Абая, 10",
    status: "IN_PROGRESS",
    statusHistory: [
      { status: "ACCEPTED", at: now - 1000 * 60 * 45, by: "ADMIN" },
      { status: "ASSIGNED", at: now - 1000 * 60 * 40, by: "ADMIN" },
      { status: "IN_PROGRESS", at: now - 1000 * 60 * 35, by: "WORKER" },
    ],
    createdAt: now - 1000 * 60 * 45,
    updatedAt: now - 1000 * 60 * 35,
    assignedWorkerId: "w1",
    priority: "HIGH",
    reworkCount: 0,
    workStartedAt: now - 1000 * 60 * 35,
  },
  {
    id: "r2",
    category: "TRASH",
    description: "Переполнены контейнеры, нужно вывезти мусор.",
    photoUri: undefined,
    location: { lat: 43.2402, lon: 76.8823, accuracy: 25 },
    addressLabel: "мкр. Самал, 2",
    status: "ASSIGNED",
    statusHistory: [
      { status: "ACCEPTED", at: now - 1000 * 60 * 20, by: "ADMIN" },
      { status: "ASSIGNED", at: now - 1000 * 60 * 18, by: "ADMIN" },
    ],
    createdAt: now - 1000 * 60 * 20,
    updatedAt: now - 1000 * 60 * 18,
    assignedWorkerId: "w2",
    priority: "MEDIUM",
    reworkCount: 0,
  },
  {
    id: "r3",
    category: "ROAD",
    description: "Яма на дороге, опасно для машин.",
    photoUri: undefined,
    location: { lat: 43.2351, lon: 76.905, accuracy: 35 },
    addressLabel: "ул. Сатпаева, 45",
    status: "ACCEPTED",
    statusHistory: [{ status: "ACCEPTED", at: now - 1000 * 60 * 5, by: "ADMIN" }],
    createdAt: now - 1000 * 60 * 5,
    updatedAt: now - 1000 * 60 * 5,
    assignedWorkerId: undefined,
    priority: "LOW",
    reworkCount: 0,
  },
];
