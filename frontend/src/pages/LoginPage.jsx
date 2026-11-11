import { useState } from "react";
import { Scale, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { errorText } from "@/lib/api";
import { COLORS, COLOR_ORDER } from "@/lib/urgency";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grain min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between p-14 border-r border-slate-800 bg-[#0d1320] relative z-10">
        <div className="flex items-center gap-3 text-slate-300">
          <Scale className="h-5 w-5" /> <span className="font-semibold tracking-tight">Shared Deadline List</span>
        </div>
        <div className="space-y-8 rise">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-50 leading-[1.05]">
            Every deadline,<br />one shared docket.
          </h1>
          <ul className="space-y-3 max-w-md">
            {COLOR_ORDER.map((c, i) => (
              <li key={c} className="flex items-center gap-3 rise" style={{ animationDelay: `${120 + i * 80}ms` }}>
                <span className="h-3 w-8 rounded-sm" style={{ background: COLORS[c].dot }} />
                <span className="text-slate-300 text-sm">{COLORS[c].label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500 font-mono">Accounts are created by your administrator.</p>
      </section>

      <section className="flex items-center px-6 sm:px-14 relative z-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6 rise" data-testid="login-form">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-50">Sign in</h2>
            <p className="text-sm text-slate-400 mt-1">Use the email your team admin set up for you.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100" data-testid="login-email-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100" data-testid="login-password-input" />
          </div>
          {error && <p className="text-sm text-rose-400" data-testid="login-error">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="login-submit-button">
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Sign in
          </Button>
        </form>
      </section>
    </div>
  );
}
