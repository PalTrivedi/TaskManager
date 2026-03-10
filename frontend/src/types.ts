export type Priority = "low" | "medium" | "high";

export interface Task {
  id: number;
  user_id?: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Summary {
  total: number;
  completed: number;
  pending: number;
  high_priority: number;
}

export interface TaskFormState {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  due_date: string;
}
