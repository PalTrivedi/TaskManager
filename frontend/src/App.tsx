import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
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

function formatDate(value: string | null): string {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function priorityTone(priority: Task["priority"]): string {
  if (priority === "high") return "High focus";
  if (priority === "medium") return "Steady pace";
  return "Light lift";
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
  const userEmail = session?.user.email ?? "Signed in";

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
      setError(err instanceof Error ? err.message : "Failed to load tasks");
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
      if (nextSession?.access_token) {
        void loadDashboard(nextSession.access_token);
      } else {
        setTasks([]);
        setSummary({ total: 0, completed: 0, pending: 0, high_priority: 0 });
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
        });
        if (signUpError) throw signUpError;
        setAuthMessage("Account created. If email confirmation is enabled, confirm it first.");
        setAuthMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        if (signInError) throw signInError;
        setAuthMessage("");
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
      setTaskForm(initialTaskForm);
      setAuthMessage("");
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
      setError(err instanceof Error ? err.message : "Could not create task");
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
      setError(err instanceof Error ? err.message : "Could not update task");
    }
  }

  async function removeTask(taskId: number) {
    if (!accessToken) return;
    setError("");
    try {
      await deleteTaskWithAuth(accessToken, taskId);
      await loadDashboard(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
    }
  }

  return (
    <div className="app-shell">
      <div className="halo halo-one" />
      <div className="halo halo-two" />
      <div className="grain" />

      <main className="layout">
        <section className="hero card">
          <div className="hero-copy">
            <p className="eyebrow">Task Party Studio</p>
            <h1>Organized, adorable, and finally locked to your account.</h1>
            <p className="hero-text">
              Bright planning for serious work. Sign in, keep your own task lane, and
              never leak your list into someone else&apos;s browser again.
            </p>
            <div className="hero-tags">
              <span>Personal workspace</span>
              <span>Supabase auth</span>
              <span>Private task stream</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="score-card card-pink">
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="score-card card-gold">
              <span>Done</span>
              <strong>{summary.completed}</strong>
            </div>
            <div className="score-card card-blue">
              <span>Pending</span>
              <strong>{summary.pending}</strong>
            </div>
            <div className="score-card card-green">
              <span>High priority</span>
              <strong>{summary.high_priority}</strong>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <aside className="sidebar-stack">
            <section className="card auth-card">
              <div className="section-title">
                <p className="section-kicker">Private access</p>
                <h2>{session ? "Your workspace" : authMode === "signin" ? "Welcome back" : "Create account"}</h2>
                <p>
                  {session
                    ? "Tasks are scoped to the authenticated user behind this session."
                    : "Use Supabase Auth so every task belongs to one real account."}
                </p>
              </div>

              {authLoading ? (
                <div className="empty-state">Checking session...</div>
              ) : session ? (
                <div className="signed-in-panel">
                  <div className="user-chip">
                    <div className="avatar-dot" />
                    <div>
                      <strong>{userEmail}</strong>
                      <p>Authenticated and isolated</p>
                    </div>
                  </div>
                  <button type="button" className="secondary-btn" onClick={() => void handleSignOut()}>
                    {authBusy ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
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
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </form>
              )}
            </section>

            <form className="card composer" onSubmit={handleTaskSubmit}>
              <div className="section-title">
                <p className="section-kicker">New task</p>
                <h2>Add a polished little mission</h2>
                <p>Fast capture on the left, tidy parade on the right.</p>
              </div>

              <label>
                <span>Task title</span>
                <input
                  required
                  disabled={!session}
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  placeholder="Ship portfolio refresh"
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  rows={4}
                  disabled={!session}
                  value={taskForm.description}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, description: event.target.value })
                  }
                  placeholder="Add a crisp note so tomorrow-you thanks you."
                />
              </label>

              <div className="split-fields">
                <label>
                  <span>Category</span>
                  <select
                    disabled={!session}
                    value={taskForm.category}
                    onChange={(event) =>
                      setTaskForm({ ...taskForm, category: event.target.value })
                    }
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
                    disabled={!session}
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
                  disabled={!session}
                  value={taskForm.due_date}
                  onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}
                />
              </label>

              <button type="submit" className="primary-btn" disabled={submitting || !session}>
                {submitting ? "Saving..." : session ? "Add task" : "Sign in to add tasks"}
              </button>
            </form>
          </aside>

          <section className="card board">
            <div className="board-header">
              <div className="section-title">
                <p className="section-kicker">Task parade</p>
                <h2>Today&apos;s task parade</h2>
                <p>Private to your account, scrollable when the list gets busy.</p>
              </div>
              {session ? <div className="mini-badge">{userEmail}</div> : null}
            </div>

            {error ? <div className="alert">{error}</div> : null}
            {!session && !authLoading ? (
              <div className="empty-state">Sign in to load your private task board.</div>
            ) : null}
            {loading ? <div className="empty-state">Loading your parade...</div> : null}

            <div className="task-list-shell">
              {!loading && session && tasks.length === 0 ? (
                <div className="empty-state">No tasks yet. Start with one elegant win.</div>
              ) : null}

              <div className="task-list">
                {tasks.map((task) => (
                  <article className={`task-card priority-${task.priority}`} key={task.id}>
                    <div className="task-top">
                      <div>
                        <p className="task-category">
                          {task.category} <span>{priorityTone(task.priority)}</span>
                        </p>
                        <h3 className={task.completed ? "completed" : ""}>{task.title}</h3>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void removeTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                      >
                        Del
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
