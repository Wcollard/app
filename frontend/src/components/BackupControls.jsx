import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, errorText } from "@/lib/api";
import { DeleteDialog } from "@/components/DeleteDialog";

export const BackupControls = ({ isAdmin, onRestored, className }) => {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);

  const download = async () => {
    try {
      const { data } = await api.get("/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `deadlines-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Backup downloaded (${data.tasks.length} tasks)`);
    } catch (e) { toast.error(errorText(e)); }
  };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed?.tasks)) throw new Error("This file is not a deadline list backup.");
      setPending({ title: file.name, tasks: parsed.tasks });
    } catch (err) { toast.error(err.message || "Could not read that file."); }
  };

  const restore = async () => {
    try {
      const { data } = await api.post("/restore", { tasks: pending.tasks });
      toast.success(`Restored ${data.restored} tasks`);
      setPending(null);
      onRestored();
    } catch (e) { toast.error(errorText(e)); }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className={className} onClick={download} data-testid="backup-download-button">
        <Download className="h-4 w-4 mr-1" /> Backup
      </Button>
      {isAdmin && (
        <>
          <Button variant="ghost" size="sm" className={className} onClick={() => fileRef.current?.click()} data-testid="backup-restore-button">
            <Upload className="h-4 w-4 mr-1" /> Restore
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={pick} data-testid="backup-restore-file-input" />
          <DeleteDialog
            task={pending}
            onClose={() => setPending(null)}
            onConfirm={restore}
            title="Restore from backup"
            text={pending && `Replace every task in the shared list with the ${pending.tasks.length} tasks in “${pending.title}”? Current tasks will be removed.`}
          />
        </>
      )}
    </>
  );
};
