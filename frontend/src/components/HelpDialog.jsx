import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COLORS, COLOR_ORDER } from "@/lib/urgency";

export const HelpDialog = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl bg-slate-900 border-slate-700 text-slate-200 max-h-[85vh] overflow-y-auto" data-testid="help-dialog">
      <DialogHeader><DialogTitle className="text-slate-50">How to use the list</DialogTitle></DialogHeader>
      <div className="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 className="font-semibold text-slate-100 mb-1">Sharing</h3>
          <p className="text-slate-400">Everyone signs in to this same web app and sees the same list. Your admin adds team members under Team. The list reloads every 5 seconds; Refresh or F5 reloads now. Each change is stamped with the name of the person who made it.</p>
        </section>
        <section>
          <h3 className="font-semibold text-slate-100 mb-1">Using the list</h3>
          <ul className="list-disc pl-5 text-slate-400 space-y-1">
            <li>Click a hyperlink to open it in a new tab.</li>
            <li>Right-click a deadline to change its color:</li>
          </ul>
          <ul className="pl-9 mt-1 space-y-1">
            {COLOR_ORDER.map((c) => (
              <li key={c} className="flex items-center gap-2"><span className="h-2.5 w-6 rounded-sm" style={{ background: COLORS[c].dot }} /><span className="capitalize">{c}</span><span className="text-slate-500">= {COLORS[c].label}</span></li>
            ))}
          </ul>
          <ul className="list-disc pl-5 text-slate-400 space-y-1 mt-2">
            <li>Double-click a task to edit the date, link, assignee, or notes.</li>
            <li>Color is chosen by hand. It does not change automatically when a date gets close. The deadline column still shows “today”, “in N days”, or “N days overdue”.</li>
            <li>Put the other person's name in Assignee when a deadline is theirs.</li>
          </ul>
        </section>
        <section>
          <h3 className="font-semibold text-slate-100 mb-1">Backup</h3>
          <p className="text-slate-400">Use Backup now and then and keep the downloaded file somewhere safe. An admin can use Restore to replace the list with a backup file.</p>
        </section>
      </div>
    </DialogContent>
  </Dialog>
);
