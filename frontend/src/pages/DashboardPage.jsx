import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorText } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { UrgencyStats } from "@/components/UrgencyStats";
import { FilterBar, EMPTY_FILTERS } from "@/components/FilterBar";
import { TaskTable } from "@/components/TaskTable";
import { TaskDialog } from "@/components/TaskDialog";
import { DeleteDialog } from "@/components/DeleteDialog";

const POLL_MS = 5000;
const SORT_FIELD = { title: "title", assignee: "assignee", matter_no: "matter_no", deadline: "deadline", status: "color", link: "hyperlink", updated: "updated_at" };
const COLOR_RANK = { green: 0, blue: 1, yellow: 2, red: 3 };

function matches(t, f) {
  const q = f.search.trim().toLowerCase();
  if (q && ![t.title, t.assignee, t.matter_no, t.notes].join(" ").toLowerCase().includes(q)) return false;
  if (f.matter.trim() && !t.matter_no.toLowerCase().includes(f.matter.trim().toLowerCase())) return false;
  return f.urgency === "all" || t.color === f.urgency;
}

function compare(a, b, key) {
  const field = SORT_FIELD[key];
  if (field === "color") return COLOR_RANK[a.color] - COLOR_RANK[b.color];
  return (a[field] || "").localeCompare(b[field] || "", undefined, { sensitivity: "base" });
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState({ key: "deadline", desc: false });
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/tasks");
      setTasks(data);
      setOnline(true);
      setLastSync(new Date());
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const onKey = (e) => {
      if (e.key === "F5") { e.preventDefault(); refresh(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearInterval(timer); window.removeEventListener("keydown", onKey); };
  }, [refresh]);

  const visible = useMemo(() => {
    const rows = tasks.filter((t) => matches(t, filters));
    rows.sort((a, b) => {
      const r = compare(a, b, sort.key);
      return (sort.desc ? -r : r) || a.title.localeCompare(b.title);
    });
    return rows;
  }, [tasks, filters, sort]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: false }));

  const setColor = async (task, color) => {
    try {
      await api.patch(`/tasks/${task.id}/color`, { color });
      refresh();
    } catch (e) { toast.error(errorText(e)); }
  };

  const save = async (payload) => {
    if (editing?.id) await api.put(`/tasks/${editing.id}`, payload);
    else await api.post("/tasks", payload);
    toast.success(editing?.id ? "Task updated" : "Task added");
    setEditing(null);
    refresh();
  };

  const remove = async () => {
    try {
      await api.delete(`/tasks/${deleting.id}`);
      toast.success("Task deleted");
      setDeleting(null);
      refresh();
    } catch (e) { toast.error(errorText(e)); }
  };

  return (
    <div className="grain min-h-screen">
      <AppHeader online={online} lastSync={lastSync} onRefresh={refresh} />
      <main className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 rise">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-50">Deadlines</h1>
            <p className="text-sm text-slate-400 mt-1">Right-click a row to set its urgency. Double-click to edit.</p>
          </div>
          <Button onClick={() => setEditing({})} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="new-task-button">
            <Plus className="h-4 w-4 mr-1" /> New task
          </Button>
        </div>
        <UrgencyStats tasks={tasks} active={filters.urgency} onPick={(u) => setFilters((f) => ({ ...f, urgency: f.urgency === u ? "all" : u }))} />
        <FilterBar filters={filters} setFilters={setFilters} shown={visible.length} total={tasks.length} />
        <TaskTable
          tasks={visible}
          sort={sort}
          onSort={toggleSort}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={setEditing}
          onDelete={setDeleting}
          onColor={setColor}
          onDuplicate={(t) => setEditing({ ...t, id: undefined, title: `${t.title} (copy)` })}
        />
      </main>
      <TaskDialog task={editing} onClose={() => setEditing(null)} onSave={save} />
      <DeleteDialog task={deleting} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}
