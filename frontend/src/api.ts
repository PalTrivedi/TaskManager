import type { Summary, Task, TaskFormState } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 10000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    window.clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Check that the FastAPI server is running on ${API_BASE}.`,
      );
    }
    throw error;
  }

  window.clearTimeout(timeoutId);

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep the generic message when no JSON error body exists.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchTasks(): Promise<Task[]> {
  return request<Task[]>("/api/tasks");
}

export function fetchSummary(): Promise<Summary> {
  return request<Summary>("/api/summary");
}

export function createTask(task: TaskFormState): Promise<Task> {
  return request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      ...task,
      due_date: task.due_date || null,
    }),
  });
}

export function updateTask(taskId: number, updates: Partial<Task>): Promise<Task> {
  return request<Task>(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteTask(taskId: number): Promise<void> {
  return request<void>(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}
