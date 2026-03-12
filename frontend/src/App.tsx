import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  ApiError,
  createTaskWithAuth,
  deleteTaskWithAuth,
  fetchSummaryWithAuth,
  fetchTasksWithAuth,
  updateTaskWithAuth,
} from "./api";
import { supabase } from "./supabase";
import type { AuthFormState, Summary, Task, TaskFormState } from "./types";

const initialTaskForm: TaskFormState = {
  title: "",
  description: "",
  category: "Personal",
  priority: "medium",
  due_date: "",
};

const initialAuthForm: AuthFormState = {
  email: "",
  password: "",
};

const categories = ["Personal", "Work", "Study", "Health", "Errands", "Fun"];
const emailRedirectTo =
  typeof window === "undefined" ? undefined : `${window.location.origin}/`;

function formatDate(value: string | null): string {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function priorityLabel(priority: Task["priority"]): string {
  if (priority === "high") return "High priority";
  if (priority === "medium") return "Medium priority";
  return "Low priority";
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authForm, setAuthForm] = useState<AuthFormState>(initialAuthForm);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    completed: 0,
    pending: 0,
    high_priority: 0,
  });
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const accessToken = session?.access_token ?? "";
  const userEmail = session?.user.email ?? "";

  async function signOutForExpiredSession() {
    setError("");
    setAuthMessage("Your session expired. Please sign in again.");
    await supabase.auth.signOut();
  }

  async function handleApiFailure(err: unknown, fallbackMessage: string) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      await signOutForExpiredSession();
      return;
    }
    setError(err instanceof Error ? err.message : fallbackMessage);
  }

  async function loadDashboard(token: string) {
    setLoading(true);
    try {
      const [taskData, summaryData] = await Promise.all([
        fetchTasksWithAuth(token),
        fetchSummaryWithAuth(token),
      ]);
      setTasks(taskData);
      setSummary(summaryData);
      setError("");
    } catch (err) {
      await handleApiFailure(err, "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setSession(existingSession);
      setAuthLoading(false);

      if (existingSession?.access_token) {
        void loadDashboard(existingSession.access_token);
      }
    }

    void boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      setError("");
      setAuthMessage("");
      if (nextSession?.access_token) {
        void loadDashboard(nextSession.access_token);
      } else {
        setTasks([]);
        setSummary({ total: 0, completed: 0, pending: 0, high_priority: 0 });
        setTaskForm(initialTaskForm);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    try {
      if (authMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            emailRedirectTo,
          },
        });
        if (signUpError) throw signUpError;
        setAuthMessage("Account created. Sign in to open your private workspace.");
        setAuthMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setError("");
    setSubmitting(true);
    try {
      await createTaskWithAuth(accessToken, taskForm);
      setTaskForm(initialTaskForm);
      await loadDashboard(accessToken);
    } catch (err) {
      await handleApiFailure(err, "Could not create task");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTask(task: Task) {
    if (!accessToken) return;
    setError("");
    try {
      await updateTaskWithAuth(accessToken, task.id, { completed: !task.completed });
      await loadDashboard(accessToken);
    } catch (err) {
      await handleApiFailure(err, "Could not update task");
    }
  }

  async function removeTask(taskId: number) {
    if (!accessToken) return;
    setError("");
    try {
      await deleteTaskWithAuth(accessToken, taskId);
      await loadDashboard(accessToken);
    } catch (err) {
      await handleApiFailure(err, "Could not delete task");
    }
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <main className="auth-page">
          <section className="auth-panel auth-panel-loading">
            <p className="auth-brand">Task Party</p>
            <h1>Loading your private workspace...</h1>
          </section>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <main className="auth-page">
          <section className="auth-panel auth-copy">
            <p className="auth-brand">Task Party</p>
            <h1>Private planning with a softer, sharper edge.</h1>
            <p className="auth-lead">
              Sign in to enter your own task room. Every list is tied to a verified account,
              so your tasks stay yours.
            </p>
            <div className="auth-notes">
              <span>Account-based privacy</span>
              <span>Supabase authentication</span>
              <span>Focused daily task flow</span>
            </div>
          </section>

          <section className="auth-panel auth-form-panel">
            <div className="auth-header">
              <p className="section-kicker">Secure access</p>
              <h2>{authMode === "signin" ? "Sign in" : "Create your account"}</h2>
              <p>
                {authMode === "signin"
                  ? "Pick up exactly where you left your task list."
                  : "Create a dedicated account for your personal task space."}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="auth-switch">
                <button
                  type="button"
                  className={authMode === "signin" ? "switch-pill active" : "switch-pill"}
                  onClick={() => setAuthMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={authMode === "signup" ? "switch-pill active" : "switch-pill"}
                  onClick={() => setAuthMode("signup")}
                >
                  Sign up
                </button>
              </div>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="you@example.com"
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="At least 6 characters"
                />
              </label>

              {authMessage ? <div className="info-banner">{authMessage}</div> : null}

              <button type="submit" className="primary-btn" disabled={authBusy}>
                {authBusy
                  ? "Working..."
                  : authMode === "signin"
                    ? "Enter workspace"
                    : "Create account"}
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <main className="dashboard-layout">
        <section className="hero card">
          <div className="hero-copy">
            <p className="eyebrow">Task Party</p>
            <h1>Plan your day with a calm, charming system.</h1>
            <p className="hero-text">
              Your workspace is private, signed in, and built for clean momentum.
            </p>
            <div className="hero-subrow">
              <div className="user-chip">
                <div className="avatar-dot" />
                <div>
                  <strong>{userEmail}</strong>
                  <p>Signed in and isolated</p>
                </div>
              </div>
              <button type="button" className="secondary-btn signout-btn" onClick={() => void handleSignOut()}>
                {authBusy ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>

          <div className="hero-panel">
            <div className="score-card card-rose">
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="score-card card-amber">
              <span>Done</span>
              <strong>{summary.completed}</strong>
            </div>
            <div className="score-card card-sky">
              <span>Pending</span>
              <strong>{summary.pending}</strong>
            </div>
            <div className="score-card card-mint">
              <span>High priority</span>
              <strong>{summary.high_priority}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <form className="card composer" onSubmit={handleTaskSubmit}>
            <div className="section-title">
              <p className="section-kicker">New task</p>
              <h2>Add a new mission</h2>
              <p>Capture the work quickly, then keep the list moving.</p>
            </div>

            <label>
              <span>Task title</span>
              <input
                required
                value={taskForm.title}
                onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                placeholder="Launch homepage refresh"
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                rows={4}
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm({ ...taskForm, description: event.target.value })
                }
                placeholder="A short note, context, or next step."
              />
            </label>

            <div className="split-fields">
              <label>
                <span>Category</span>
                <select
                  value={taskForm.category}
                  onChange={(event) => setTaskForm({ ...taskForm, category: event.target.value })}
                >
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      priority: event.target.value as TaskFormState["priority"],
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label>
              <span>Due date</span>
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}
              />
            </label>

            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? "Saving..." : "Add task"}
            </button>
          </form>

          <section className="card board">
            <div className="board-header">
              <div className="section-title">
                <p className="section-kicker">Task parade</p>
                <h2>Today&apos;s task parade</h2>
                <p>Your personal list, now in a cleaner and calmer layout.</p>
              </div>
            </div>

            {error ? <div className="alert">{error}</div> : null}
            {loading ? <div className="empty-state">Loading your tasks...</div> : null}

            <div className="task-list-shell">
              {!loading && tasks.length === 0 ? (
                <div className="empty-state">No tasks yet. Start with one tiny win.</div>
              ) : null}

              <div className="task-list">
                {tasks.map((task) => (
                  <article className={`task-card priority-${task.priority}`} key={task.id}>
                    <div className="task-top">
                      <div>
                        <p className="task-category">
                          {task.category} <span>{priorityLabel(task.priority)}</span>
                        </p>
                        <h3 className={task.completed ? "completed" : ""}>{task.title}</h3>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void removeTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                      >
                        Remove
                      </button>
                    </div>

                    <p className="task-desc">{task.description || "No extra notes. Clean and focused."}</p>

                    <div className="task-meta">
                      <span>{formatDate(task.due_date)}</span>
                      <span>{task.completed ? "Completed" : "In progress"}</span>
                    </div>

                    <button
                      type="button"
                      className={`toggle-btn ${task.completed ? "done" : ""}`}
                      onClick={() => void toggleTask(task)}
                    >
                      {task.completed ? "Move back to active" : "Mark complete"}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
