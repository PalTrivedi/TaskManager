import { FormEvent, useEffect, useState } from "react";

import { createTask, deleteTask, fetchSummary, fetchTasks, updateTask } from "./api";
import type { Summary, Task, TaskFormState } from "./types";

const initialForm: TaskFormState = {
  title: "",
  description: "",
  category: "Personal",
  priority: "medium",
  due_date: "",
};

const badges = [
  { emoji: "🌈", label: "Bright mode only" },
  { emoji: "⚡", label: "Fast task flow" },
  { emoji: "🎉", label: "Mood-lifting UI" },
];

const categories = ["Personal", "Work", "Study", "Health", "Errands", "Fun"];

function formatDate(value: string | null): string {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    completed: 0,
    pending: 0,
    high_priority: 0,
  });
  const [form, setForm] = useState<TaskFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    try {
      const [taskData, summaryData] = await Promise.all([fetchTasks(), fetchSummary()]);
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
    void loadDashboard();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createTask(form);
      setForm(initialForm);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTask(task: Task) {
    setError("");
    try {
      await updateTask(task.id, { completed: !task.completed });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task");
    }
  }

  async function removeTask(taskId: number) {
    setError("");
    try {
      await deleteTask(taskId);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
    }
  }

  return (
    <div className="app-shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />

      <main className="layout">
        <section className="hero card">
          <div className="hero-copy">
            <p className="eyebrow">🌟 Task Party</p>
            <h1>Plan your day like it is a confetti-powered boss battle.</h1>
            <p className="hero-text">
              A cheerful task board with bold colors, quick actions, and a tiny emotional
              support squad of emojis.
            </p>
            <div className="badge-row">
              {badges.map((badge) => (
                <span className="badge" key={badge.label}>
                  <span>{badge.emoji}</span>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            <div className="score-card score-pink">
              <span>📌 Total</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="score-card score-yellow">
              <span>✅ Done</span>
              <strong>{summary.completed}</strong>
            </div>
            <div className="score-card score-blue">
              <span>⏳ Pending</span>
              <strong>{summary.pending}</strong>
            </div>
            <div className="score-card score-green">
              <span>🚨 High priority</span>
              <strong>{summary.high_priority}</strong>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <form className="card composer" onSubmit={handleSubmit}>
            <div className="section-title">
              <h2>✨ Add a new mission</h2>
              <p>Keep it fast, bright, and very satisfying.</p>
            </div>

            <label>
              <span>Task title 📝</span>
              <input
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Launch homepage refresh"
              />
            </label>

            <label>
              <span>Description 💬</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Add a little context so future-you stays happy."
              />
            </label>

            <div className="split-fields">
              <label>
                <span>Category 🗂️</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                >
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Priority 🎯</span>
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm({
                      ...form,
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
              <span>Due date 📅</span>
              <input
                type="date"
                value={form.due_date}
                onChange={(event) => setForm({ ...form, due_date: event.target.value })}
              />
            </label>

            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? "Saving..." : "Add task 🎉"}
            </button>
          </form>

          <section className="card board">
            <div className="section-title">
              <h2>🌈 Today&apos;s task parade</h2>
              <p>Tap complete, delete clutter, keep momentum loud.</p>
            </div>

            {error ? <div className="alert">{error}</div> : null}
            {loading ? <div className="empty-state">Loading sparkles...</div> : null}

            {!loading && tasks.length === 0 ? (
              <div className="empty-state">No tasks yet. Start with one tiny win 🪄</div>
            ) : null}

            <div className="task-list">
              {tasks.map((task) => (
                <article className={`task-card priority-${task.priority}`} key={task.id}>
                  <div className="task-top">
                    <div>
                      <p className="task-category">
                        {task.category} {task.priority === "high" ? "🔥" : task.priority === "medium" ? "✨" : "🌼"}
                      </p>
                      <h3 className={task.completed ? "completed" : ""}>{task.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeTask(task.id)}
                      aria-label={`Delete ${task.title}`}
                    >
                      🗑️
                    </button>
                  </div>

                  <p className="task-desc">{task.description || "No extra notes. Pure action."}</p>

                  <div className="task-meta">
                    <span>📆 {formatDate(task.due_date)}</span>
                    <span>{task.completed ? "✅ Completed" : "🚀 In progress"}</span>
                  </div>

                  <button
                    type="button"
                    className={`toggle-btn ${task.completed ? "done" : ""}`}
                    onClick={() => toggleTask(task)}
                  >
                    {task.completed ? "Mark as pending ↩️" : "Mark complete 🎊"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
