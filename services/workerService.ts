import { apiClient } from "@/api/client";
import type { Worker } from "@/types/domain";

type WorkerDto = {
  id: string;
  name: string;
  contractorName: string;
  rating: number;
};

export async function getWorkers(): Promise<Worker[]> {
  const res = await apiClient.get<{ items: WorkerDto[] }>("/workers");
  return res.data.items.map((w) => ({
    id: w.id,
    name: w.name,
    contractorName: w.contractorName,
    rating: w.rating,
  }));
}
