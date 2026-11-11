import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const field = "bg-slate-950 border-slate-700 text-slate-100";
const BLANK = { name: "", email: "", password: "", role: "member" };

const AddUserForm = ({ onAdded }) => {
  const [form, setForm] = useState(BLANK);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      toast.success(`Added ${form.name}`);
      setForm(BLANK);
      onAdded();
    } catch (err) { toast.error(errorText(err)); }
  };
  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-2 rounded-lg border border-slate-800 p-3">
      <Input required placeholder="Name" value={form.name} onChange={set("name")} className={field} data-testid="user-name-input" />
      <Input required type="email" placeholder="Email" value={form.email} onChange={set("email")} className={field} data-testid="user-email-input" />
      <Input required minLength={8} type="password" placeholder="Password (8+ characters)" value={form.password} onChange={set("password")} className={field} data-testid="user-password-input" />
      <Select value={form.role} onValueChange={set("role")}>
        <SelectTrigger className={field} data-testid="user-role-select"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 text-white" data-testid="user-add-button">
        <UserPlus className="h-4 w-4 mr-1" /> Add team member
      </Button>
    </form>
  );
};

export const UsersDialog = ({ open, onOpenChange }) => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const load = useCallback(() => api.get("/users").then((r) => setUsers(r.data)).catch((e) => toast.error(errorText(e))), []);

  useEffect(() => {
    if (open) { load(); }
  }, [open, load]);

  const resetPw = async (u) => {
    const password = window.prompt(`New password for ${u.name} (8+ characters):`);
    if (!password) return;
    try { await api.put(`/users/${u.id}/password`, { password }); toast.success("Password updated"); }
    catch (e) { toast.error(errorText(e)); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Remove ${u.name}? They will no longer be able to sign in.`)) return;
    try { await api.delete(`/users/${u.id}`); load(); }
    catch (e) { toast.error(errorText(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700 text-slate-100 max-h-[85vh] overflow-y-auto" data-testid="users-dialog">
        <DialogHeader><DialogTitle className="text-slate-50">Team</DialogTitle></DialogHeader>
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-3 py-2.5" data-testid={`user-row-${u.id}`}>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{u.name} <span className="text-xs text-slate-500 ml-1 uppercase">{u.role}</span></div>
                <div className="text-xs text-slate-400 font-mono truncate">{u.email}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => resetPw(u)} className="text-slate-300 hover:bg-slate-800 hover:text-white" data-testid={`user-reset-password-${u.id}`}><KeyRound className="h-4 w-4" /></Button>
              {u.id !== me.id && (
                <Button size="sm" variant="ghost" onClick={() => remove(u)} className="text-rose-400 hover:bg-rose-950/50 hover:text-rose-300" data-testid={`user-delete-${u.id}`}><Trash2 className="h-4 w-4" /></Button>
              )}
            </li>
          ))}
        </ul>
        <AddUserForm onAdded={load} />
      </DialogContent>
    </Dialog>
  );
};
