import { ExternalLink, Pencil, Copy, Trash2, Hash } from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { COLORS, COLOR_ORDER, formatDate, formatUpdated, relativeDeadline, safeHref } from "@/lib/urgency";

const Deadline = ({ value }) => {
  if (!value) return <span className="text-slate-600">—</span>;
  const rel = relativeDeadline(value);
  return (
    <div className="flex flex-col">
      <span className="font-mono text-slate-200">{formatDate(value)}</span>
      {rel && <span className={`text-xs rel-${rel.tone}`}>{rel.text}</span>}
    </div>
  );
};

const LinkCell = ({ url }) => {
  const href = safeHref(url);
  if (!url) return <span className="text-slate-600">—</span>;
  if (!href) return <span className="text-slate-400 truncate">{url}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={url} onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 max-w-[220px] text-blue-400 hover:text-blue-300 hover:underline" data-testid="task-link">
      <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
    </a>
  );
};

export const TaskRow = ({ task, selectedId, onSelect, onEdit, onDelete, onColor, onDuplicate }) => {
  const copyMatter = () => {
    navigator.clipboard?.writeText(task.matter_no).then(() => toast.success("Matter No copied"), () => toast.error("Could not copy"));
  };
  return (
    <ContextMenu onOpenChange={(open) => open && onSelect(task.id)}>
      <ContextMenuTrigger asChild>
        <tr
          className={`task-row row-${task.color} border-b border-slate-800/70 cursor-pointer select-none`}
          data-selected={selectedId === task.id}
          onClick={() => onSelect(task.id)}
          onDoubleClick={() => onEdit(task)}
          data-testid={`task-row-${task.id}`}
        >
          <td className="px-4 py-3 font-semibold text-slate-100" data-testid="task-title">{task.title}</td>
          <td className="px-4 py-3 text-slate-300">{task.assignee}</td>
          <td className="px-4 py-3 font-mono text-slate-300">{task.matter_no}</td>
          <td className="px-4 py-3"><Deadline value={task.deadline} /></td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium badge-${task.color}`} data-testid="task-urgency">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[task.color].dot }} />
              {COLORS[task.color].label}
            </span>
          </td>
          <td className="px-4 py-3"><LinkCell url={task.hyperlink} /></td>
          <td className="px-4 py-3 text-xs text-slate-400">
            <div className="font-mono">{formatUpdated(task.updated_at)}</div>
            {task.updated_by && <div className="text-slate-500">by {task.updated_by}</div>}
          </td>
        </tr>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60 bg-slate-900 border-slate-700 text-slate-200" data-testid={`task-row-context-menu-${task.id}`}>
        <ContextMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Set urgency</ContextMenuLabel>
        {COLOR_ORDER.map((c) => (
          <ContextMenuItem key={c} onSelect={() => onColor(task, c)} className="gap-2 focus:bg-slate-800 focus:text-white" data-testid={`context-set-urgency-${c}`}>
            <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[c].dot }} />
            {COLORS[c].label}
            {task.color === c && <span className="ml-auto text-xs text-slate-500">current</span>}
          </ContextMenuItem>
        ))}
        <ContextMenuSeparator className="bg-slate-700" />
        <ContextMenuItem onSelect={() => onEdit(task)} className="gap-2 focus:bg-slate-800 focus:text-white" data-testid="context-edit-task"><Pencil className="h-4 w-4" /> Edit task</ContextMenuItem>
        <ContextMenuItem onSelect={() => onDuplicate(task)} className="gap-2 focus:bg-slate-800 focus:text-white" data-testid="context-duplicate-task"><Copy className="h-4 w-4" /> Duplicate task</ContextMenuItem>
        {task.matter_no && (
          <ContextMenuItem onSelect={copyMatter} className="gap-2 focus:bg-slate-800 focus:text-white" data-testid="context-copy-matter"><Hash className="h-4 w-4" /> Copy Matter No</ContextMenuItem>
        )}
        <ContextMenuSeparator className="bg-slate-700" />
        <ContextMenuItem onSelect={() => onDelete(task)} className="gap-2 text-rose-400 focus:bg-rose-950/50 focus:text-rose-300" data-testid="context-delete-task"><Trash2 className="h-4 w-4" /> Delete task</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
