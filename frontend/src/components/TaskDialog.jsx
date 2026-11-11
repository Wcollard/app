import { useEffect, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { COLORS, COLOR_ORDER, parseISODate, toISODate } from "@/lib/urgency";

const BLANK = { title: "", assignee: "", matter_no: "", deadline: "", color: "green", hyperlink: "", notes: "" };
const field = "bg-slate-950 border-slate-700 text-slate-100";

const DatePicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-2">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="YYYY-MM-DD" className={`${field} font-mono`} data-testid="task-deadline-input" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" data-testid="task-pick-date-button">
            <CalendarDays className="h-4 w-4 mr-1" /> Pick date
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 text-slate-100" align="end">
          <Calendar mode="single" selected={parseISODate(value) || undefined} defaultMonth={parseISODate(value) || new Date()}
            onSelect={(d) => { if (d) { onChange(toISODate(d)); setOpen(false); } }} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

const Row = ({ label, children }) => (
  <div className="grid sm:grid-cols-[130px_1fr] items-start gap-2">
    <Label className="text-slate-400 pt-2.5">{label}</Label>
    {children}
  </div>
);

export const TaskDialog = ({ task, onClose, onSave }) => {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task) { setForm({ ...BLANK, ...task }); setError(""); }
  }, [task]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Please enter a task title."); return; }
    setBusy(true);
    try {
      const { title, assignee, matter_no, deadline, color, hyperlink, notes } = form;
      await onSave({ title, assignee, matter_no, deadline, color, hyperlink, notes });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700 text-slate-100" data-testid="task-dialog">
        <DialogHeader>
          <DialogTitle className="text-slate-50">{form.title.trim() || (task?.id ? "Edit task" : "New task")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Row label="Task *"><Input autoFocus value={form.title} onChange={set("title")} className={field} data-testid="task-title-input" /></Row>
          <Row label="Assignee"><Input value={form.assignee} onChange={set("assignee")} className={field} data-testid="task-assignee-input" /></Row>
          <Row label="Matter No"><Input value={form.matter_no} onChange={set("matter_no")} className={`${field} font-mono`} data-testid="task-matter-input" /></Row>
          <Row label="Urgency">
            <Select value={form.color} onValueChange={set("color")}>
              <SelectTrigger className={field} data-testid="task-urgency-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                {COLOR_ORDER.map((c) => (
                  <SelectItem key={c} value={c} data-testid={`task-urgency-option-${c}`}>
                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[c].dot }} />{COLORS[c].label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Deadline"><DatePicker value={form.deadline} onChange={set("deadline")} /></Row>
          <Row label="Hyperlink"><Input value={form.hyperlink} onChange={set("hyperlink")} placeholder="https://…" className={field} data-testid="task-link-input" /></Row>
          <Row label="Notes"><Textarea rows={5} value={form.notes} onChange={set("notes")} className={field} data-testid="task-notes-input" /></Row>
          {error && <p className="text-sm text-rose-400" data-testid="task-dialog-error">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-300 hover:bg-slate-800 hover:text-white" data-testid="task-cancel-button">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="task-save-button">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
