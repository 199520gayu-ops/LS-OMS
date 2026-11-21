import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, User } from "../api";
import banner from "../lib/img.png"; // your image in src/lib

const BANNER_ALT = "LS Distributers: warehouse, delivery van and stacked boxes";
const fadeTop = "linear-gradient(to bottom, transparent, black 22%)"; // blends the photo into the sky-blue panel

export default function Login() {
  const nav = useNavigate(); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const d = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) });
      localStorage.setItem("token", d.token); localStorage.setItem("user", JSON.stringify(d.user)); nav("/");
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* left side (computer): company banner */}
      <div className="hidden flex-col overflow-hidden bg-[#59b6fc] md:flex">
        <div className="p-10 pb-0">
          <h1 className="max-w-md text-3xl font-semibold leading-tight text-ink">Take the order, send it to sales, follow it to delivery.</h1>
          <div className="mt-5 h-1 w-16 rounded bg-signal" />
          <p className="mt-4 text-sm text-ink/70">Turpentine oil, NC thinner and primers.</p>
        </div>
        <img src={banner} alt={BANNER_ALT} className="mt-auto w-full" style={{ WebkitMaskImage: fadeTop, maskImage: fadeTop }} />
      </div>

      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          {/* phone: banner above the form */}
          <img src={banner} alt={BANNER_ALT} className="w-full rounded-xl md:hidden" />
          <div><h2 className="text-2xl font-semibold">Sign in</h2><p className="mt-1 text-sm text-muted-foreground">Use the email your admin gave you.</p></div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="username" className="h-11" /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11" /></div>
          <Button className="h-11 w-full text-base" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </div>
    </div>
  );
}