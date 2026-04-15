import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function ProfilePage() {
  const { user, login, signup, loadMe } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    loadMe();
    api.get("/users/me").then(({ data }) => setWatchlist(data.watchlist || [])).catch(() => setWatchlist([]));
  }, []);

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-2xl font-bold">Login / Signup</h1>
        <input className="w-full rounded-xl bg-white/10 p-2" placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="w-full rounded-xl bg-white/10 p-2" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded-xl bg-white/10 p-2" placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex gap-2">
          <button onClick={() => login(form.email, form.password)} className="rounded-xl bg-violet-600 px-4 py-2">Login</button>
          <button onClick={() => signup(form.name, form.email, form.password)} className="rounded-xl bg-fuchsia-600 px-4 py-2">Signup</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{user.name}</h1>
      <p>{user.email}</p>
      <h2 className="text-xl font-semibold">Watchlist</h2>
      <div className="grid gap-3 md:grid-cols-3">{watchlist.map((m) => <div key={m._id} className="glass rounded-xl p-3">{m.title}</div>)}</div>
    </div>
  );
}
