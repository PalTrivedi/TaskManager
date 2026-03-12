import type { Summary, Task, TaskFormState } from "./types";

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8000" : "https://task-manager-f9nn.vercel.app");
const REQUEST_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function fetchTasksWithAuth(accessToken: string): Promise<Task[]> {
  return request<Task[]>("/api/tasks", accessToken);
}

export function fetchSummaryWithAuth(accessToken: string): Promise<Summary> {
  return request<Summary>("/api/summary", accessToken);
}

export function createTaskWithAuth(accessToken: string, task: TaskFormState): Promise<Task> {
  return request<Task>("/api/tasks", accessToken, {
    method: "POST",
    body: JSON.stringify({
      ...task,
      due_date: task.due_date || null,
    }),
  });
}

export function updateTaskWithAuth(
  accessToken: string,
  taskId: number,
  updates: Partial<Task>,
): Promise<Task> {
  return request<Task>(`/api/tasks/${taskId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteTaskWithAuth(accessToken: string, taskId: number): Promise<void> {
  return request<void>(`/api/tasks/${taskId}`, accessToken, {
    method: "DELETE",
  });
}
