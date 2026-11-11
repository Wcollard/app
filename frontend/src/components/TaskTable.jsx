import { ArrowDown, ArrowUp } from "lucide-react";
import { TaskRow } from "@/components/TaskRow";

const COLUMNS = [
  ["title", "Task", "min-w-[240px]"],
  ["assignee", "Assignee", "min-w-[120px]"],
  ["matter_no", "Matter No", "min-w-[110px]"],
  ["deadline", "Deadline", "min-w-[190px]"],
  ["status", "Urgency", "min-w-[170px]"],
  ["link", "Hyperlink", "min-w-[200px]"],
  ["updated", "Updated", "min-w-[150px]"],
];

export const TaskTable = ({ tasks, sort, onSort, ...rowProps }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto shadow-xl shadow-black/40">
    <table className="w-full text-sm" data-testid="deadline-task-table">
      <thead>
        <tr className="border-b border-slate-800">
          {COLUMNS.map(([key, label, w]) => (
            <th key={key} className={`${w} text-left px-4 py-3`}>
              <button
                onClick={() => onSort(key)}
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition-colors duration-150"
                data-testid={`sort-${key}`}
              >
                {label}
                {sort.key === key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => <TaskRow key={t.id} task={t} {...rowProps} />)}
        {tasks.length === 0 && (
          <tr>
            <td colSpan={COLUMNS.length} className="px-4 py-16 text-slate-500" data-testid="empty-state">
              No tasks match. Add one with “New task”, or clear the filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
