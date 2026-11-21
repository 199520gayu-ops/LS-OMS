const STATUS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-900 ring-amber-600/25",
  confirmed: "bg-blue-100 text-blue-900 ring-blue-600/25",
  dispatched: "bg-violet-100 text-violet-900 ring-violet-600/25",
  delivered: "bg-emerald-100 text-emerald-900 ring-emerald-600/25",
  cancelled: "bg-red-100 text-red-900 ring-red-600/25",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS[status] ?? "bg-muted text-muted-foreground ring-border"}`}>{status}</span>;
}
export function BrandMark({ className = "" }: { className?: string }) {
  return <span className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink text-sm font-bold text-white ${className}`}>LS<span className="absolute inset-x-1.5 bottom-1 h-0.5 rounded bg-signal" /></span>;
}
