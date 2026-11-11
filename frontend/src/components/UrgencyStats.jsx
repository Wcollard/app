import { COLORS, COLOR_ORDER } from "@/lib/urgency";

export const UrgencyStats = ({ tasks, active, onPick }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {COLOR_ORDER.map((c, i) => {
      const count = tasks.filter((t) => t.color === c).length;
      const on = active === c;
      return (
        <button
          key={c}
          onClick={() => onPick(c)}
          data-testid={`urgency-stat-${c}`}
          className={`rise text-left rounded-xl border px-4 py-3 transition-colors duration-150 badge-${c} ${on ? "ring-1 ring-current" : "opacity-90 hover:opacity-100"}`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold">{COLORS[c].label}</div>
          <div className="text-3xl font-extrabold font-mono mt-1 text-slate-50">{count}</div>
        </button>
      );
    })}
  </div>
);
