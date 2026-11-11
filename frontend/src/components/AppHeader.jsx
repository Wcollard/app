import { useState } from "react";
import { Scale, RefreshCw, HelpCircle, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { HelpDialog } from "@/components/HelpDialog";
import { UsersDialog } from "@/components/UsersDialog";
import { BackupControls } from "@/components/BackupControls";

export const AppHeader = ({ online, lastSync, onRefresh }) => {
  const { user, logout } = useAuth();
  const [help, setHelp] = useState(false);
  const [team, setTeam] = useState(false);
  const isAdmin = user.role === "admin";
  const ghost = "text-slate-300 hover:text-white hover:bg-slate-800";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0b0f17]/85 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-blue-600/15 border border-blue-500/30 grid place-items-center">
          <Scale className="h-4 w-4 text-blue-400" />
        </div>
        <span className="font-bold tracking-tight text-slate-100">Shared Deadline List</span>
        <span
          className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono border border-slate-700 text-slate-400"
          data-testid="auto-refresh-status-indicator"
        >
          <span className={`live-dot ${online ? "" : "off"}`} />
          {online ? `Live · ${lastSync ? lastSync.toLocaleTimeString() : "…"}` : "Offline"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="sm" className={ghost} onClick={onRefresh} data-testid="refresh-button">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <BackupControls isAdmin={isAdmin} onRestored={onRefresh} className={ghost} />
        {isAdmin && (
          <Button variant="ghost" size="sm" className={ghost} onClick={() => setTeam(true)} data-testid="admin-manage-button">
            <Users className="h-4 w-4 mr-1" /> Team
          </Button>
        )}
        <Button variant="ghost" size="sm" className={ghost} onClick={() => setHelp(true)} data-testid="help-dialog-button">
          <HelpCircle className="h-4 w-4 mr-1" /> Help
        </Button>
        <span className="mx-2 text-sm text-slate-400 hidden md:inline" data-testid="current-user-name">{user.name}</span>
        <Button variant="ghost" size="sm" className={ghost} onClick={logout} data-testid="logout-button">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <HelpDialog open={help} onOpenChange={setHelp} />
      {isAdmin && <UsersDialog open={team} onOpenChange={setTeam} />}
    </header>
  );
};
