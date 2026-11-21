import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, getUser } from "../api";

interface Member { _id: string; name: string; email: string; role: string }
export default function Users() {
  const me = getUser()!;
  const [items, setItems] = useState<Member[]>([]); const [editing, setEditing] = useState<Member | null>(null);
  const load = () => api<Member[]>("/users").then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (!f.password) delete f.password; // blank password = keep the old one
    try {
      await api(editing ? `/users/${editing._id}` : "/users", { method: editing ? "PATCH" : "POST", body: JSON.stringify(f) });
      toast.success(editing ? "Team member updated" : "Team member added");
      if (!editing) form.reset();
      setEditing(null); load();
    } catch (err: any) { toast.error(err.message.includes("duplicate") ? "Email already exists" : err.message); }
  }
  async function remove(u: Member) {
    if (!confirm(`Delete ${u.name}?`)) return;
    try { await api(`/users/${u._id}`, { method: "DELETE" }); toast.success("Team member deleted"); load(); } catch (e: any) { toast.error(e.message); }
  }
  const d = editing;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Team</h1>
      <Card><CardHeader><CardTitle className="text-base">{d ? `Edit: ${d.name}` : "Add team member"}</CardTitle></CardHeader><CardContent>
        <form key={d?._id || "new"} onSubmit={save} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required minLength={2} defaultValue={d?.name} /></div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required defaultValue={d?.email} /></div>
          <div className="space-y-2"><Label htmlFor="password">{d ? "New password (optional)" : "Password (min 8)"}</Label><Input id="password" name="password" type="password" required={!d} minLength={8} autoComplete="new-password" /></div>
          <div className="space-y-2"><Label htmlFor="role">Role</Label>
            <select id="role" name="role" className="h-9 w-full rounded-md border bg-background px-3 text-sm" defaultValue={d?.role || "marketing"}>
              <option value="marketing">Marketing</option><option value="sales">Sales</option><option value="admin">Admin</option></select></div>
          <div className="flex gap-2 sm:col-span-4"><Button>{d ? "Update member" : "Add member"}</Button>{d && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel edit</Button>}</div>
        </form></CardContent></Card>
      <Card className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{items.map((u) => (
          <TableRow key={u._id}><TableCell className="font-medium">{u.name}</TableCell><TableCell>{u.email}</TableCell><TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
            <TableCell className="space-x-2 text-right"><Button size="sm" variant="outline" onClick={() => { setEditing(u); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
              <Button size="sm" variant="outline" disabled={u._id === me.id} onClick={() => remove(u)}>Delete</Button></TableCell></TableRow>))}</TableBody>
      </Table></Card>
    </div>
  );
}
