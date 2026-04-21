import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import LoadingSkeleton from "../components/LoadingSkeleton";
import api from "../services/api";

export default function ProfilePage() {
  const { user, login, signup, loadMe, setUser, loadingUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [editMode, setEditMode] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      await loadMe();
      try {
        const { data } = await api.get("/movies/watchlist");
        if (alive) setWatchlist(data.watchlist || []);
      } catch {
        if (alive) setWatchlist([]);
      }
    }
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({ name: user.name || "", email: user.email || "" });
    }
  }, [user]);

  async function onLogin() {
    setError("");
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    }
  }

  async function onSignup() {
    setError("");
    try {
      await signup(form.name, form.email, form.password);
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed");
    }
  }

  async function saveProfile() {
    setError("");
    try {
      const { data } = await api.put("/users/me", editForm);
      setUser(data.user);
      setEditMode(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    }
  }

  if (loadingUser) return <LoadingSkeleton rows={4} />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-2xl font-bold">Login / Signup</h1>
        {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-200">{error}</div>}
        <input className="w-full rounded-xl bg-white/10 p-2" placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="w-full rounded-xl bg-white/10 p-2" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded-xl bg-white/10 p-2" placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex gap-2">
          <button onClick={onLogin} className="rounded-xl bg-violet-600 px-4 py-2">Login</button>
          <button onClick={onSignup} className="rounded-xl bg-fuchsia-600 px-4 py-2">Signup</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-200">{error}</div>}
      <div className="glass flex items-center justify-between rounded-xl p-4">
        <div className="space-y-2">
          {editMode ? (
            <>
              <input className="rounded-xl bg-white/10 p-2" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
              <input className="rounded-xl bg-white/10 p-2" value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p>{user.email}</p>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {!editMode && <button onClick={() => setEditMode(true)} className="rounded-xl bg-white/10 px-4 py-2">Edit Profile</button>}
          {editMode && <button onClick={saveProfile} className="rounded-xl bg-violet-600 px-4 py-2">Save</button>}
          {editMode && <button onClick={() => setEditMode(false)} className="rounded-xl bg-white/10 px-4 py-2">Cancel</button>}
        </div>
      </div>
      <h2 className="text-xl font-semibold">Watchlist</h2>
      <div className="grid gap-3 md:grid-cols-3">{watchlist.map((m) => <div key={m._id} className="glass rounded-xl p-3">{m.title}</div>)}</div>
    </div>
  );
}
