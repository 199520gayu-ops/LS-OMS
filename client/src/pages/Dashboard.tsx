import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, inr } from "../api";

const STAGES = [
  ["submitted", "Submitted", "bg-amber-400"], ["confirmed", "Confirmed", "bg-blue-500"], ["dispatched", "Dispatched", "bg-violet-500"],
  ["delivered", "Delivered", "bg-emerald-500"], ["cancelled", "Cancelled", "bg-red-400"],
] as const;
export default function Dashboard() {
  const [rows, setRows] = useState<{ _id: string; count: number; value: number }[]>([]);
  useEffect(() => { api<typeof rows>("/stats").then(setRows).catch((e) => toast.error(e.message)); }, []);
  const get = (s: string) => rows.find((r) => r._id === s) || { count: 0, value: 0 };
  const max = Math.max(1, ...STAGES.map(([s]) => get(s).count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  const live = rows.filter((r) => r._id !== "cancelled").reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold">Order pipeline</h1>
        <p className="text-sm text-muted-foreground">{total} orders worth {inr(live)}, not counting cancelled ones.</p></div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {STAGES.map(([s, label, bar]) => (
          <div key={s} className="border-b p-4 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 font-medium"><span className={`h-2.5 w-2.5 rounded-full ${bar}`} />{label}</span>
              <span className="text-sm text-muted-foreground">{inr(get(s).value)}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-muted"><div className={`h-2 rounded-full ${bar}`} style={{ width: `${(get(s).count / max) * 100}%` }} /></div>
              <span className="w-8 text-right font-semibold">{get(s).count}</span>
            </div>
          </div>))}
      </div>
    </div>
  );
}
