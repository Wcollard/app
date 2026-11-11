import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COLORS, COLOR_ORDER } from "@/lib/urgency";

export const EMPTY_FILTERS = { search: "", matter: "", urgency: "all" };

const Pill = ({ value, label, active, onClick }) => (
  <button
    onClick={onClick}
    data-testid={`urgency-filter-pill-${value}`}
    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-150 ${
      active ? (value === "all" ? "bg-slate-100 text-slate-900 border-slate-100" : `badge-${value} ring-1 ring-current`) : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
    }`}
  >
    {label}
  </button>
);

export const FilterBar = ({ filters, setFilters, shown, total }) => {
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const field = "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input value={filters.search} onChange={set("search")} placeholder="Search task, assignee, notes…" className={`${field} pl-8 w-64`} data-testid="task-search-input" />
      </div>
      <Input value={filters.matter} onChange={set("matter")} placeholder="Matter No filter" className={`${field} w-44 font-mono`} data-testid="matter-filter-input" />
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill value="all" label="All" active={filters.urgency === "all"} onClick={() => setFilters((f) => ({ ...f, urgency: "all" }))} />
        {COLOR_ORDER.map((c) => (
          <Pill key={c} value={c} label={COLORS[c].label} active={filters.urgency === c} onClick={() => setFilters((f) => ({ ...f, urgency: c }))} />
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)} className="text-slate-400 hover:text-white hover:bg-slate-800" data-testid="clear-filters-button">
        <X className="h-4 w-4 mr-1" /> Clear filters
      </Button>
      <span className="ml-auto text-xs font-mono text-slate-500" data-testid="task-count">{shown} of {total}</span>
    </div>
  );
};
