export const COLORS = {
  green: { label: "OK", dot: "#10b981" },
  blue: { label: "Not urgent", dot: "#3b82f6" },
  yellow: { label: "Near term important", dot: "#f59e0b" },
  red: { label: "Urgent non-extendable", dot: "#e11d48" },
};
export const COLOR_ORDER = ["green", "blue", "yellow", "red"];

function todayLocal() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseISODate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export function relativeDeadline(value) {
  const due = parseISODate(value);
  if (!due) return null;
  const delta = Math.round((due - todayLocal()) / 86400000);
  if (delta === 0) return { text: "today", tone: "today" };
  if (delta === 1) return { text: "tomorrow", tone: "soon" };
  if (delta === -1) return { text: "yesterday", tone: "overdue" };
  if (delta > 1) return { text: `in ${delta} days`, tone: delta <= 7 ? "soon" : "later" };
  return { text: `${-delta} days overdue`, tone: "overdue" };
}

export function formatDate(value) {
  const d = parseISODate(value);
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

export function formatUpdated(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function toISODate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function safeHref(url) {
  const lower = (url || "").toLowerCase();
  return /^(https?:|mailto:|file:)/.test(lower) ? url : null;
}
