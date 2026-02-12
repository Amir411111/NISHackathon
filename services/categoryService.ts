import { apiClient } from "@/api/client";

export type CategoryDto = { id: string; name: string; isSystem: boolean; createdBy: string | null };

export async function getCategories(): Promise<CategoryDto[]> {
  const res = await apiClient.get<{ items: CategoryDto[] }>("/categories");
  return res.data.items;
}

export async function createCategory(name: string): Promise<CategoryDto> {
  const res = await apiClient.post<CategoryDto>("/categories", { name });
  return res.data;
}
