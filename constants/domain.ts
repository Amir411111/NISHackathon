import type { Category, RequestStatus } from "@/types/domain";

export const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: "LIGHTING", label: "Свет" },
  { value: "TRASH", label: "Мусор" },
  { value: "ROAD", label: "Дорога" },
];

export const STATUS_STEPS: Array<{ value: RequestStatus; label: string }> = [
  { value: "ACCEPTED", label: "Принято" },
  { value: "ASSIGNED", label: "Назначен" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "DONE", label: "Выполнено" },
];

export const PRIORITIES = [
  { value: "HIGH" as const, label: "Высокий" },
  { value: "MEDIUM" as const, label: "Средний" },
  { value: "LOW" as const, label: "Низкий" },
];
