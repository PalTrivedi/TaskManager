import type { Summary, Task, TaskFormState } from "./types";

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8000" : "https://task-manager-f9nn.vercel.app");
const REQUEST_TIMEOUT_MS = 10000;
const USER_ID_KEY = "taskmanager:user_id";

function getUserId(): string {
  if (typeof window === "undefined") {
    return "anonymous";
  }
  let userId = window.localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    const fallback = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    userId = window.crypto?.randomUUID?.() ?? fallback;
    window.localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": getUserId(),
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
