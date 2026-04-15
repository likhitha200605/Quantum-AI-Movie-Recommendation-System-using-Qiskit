import { Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const links = ["Home", "Movies", "Recommendations", "Quantum Lab", "Dashboard", "Profile"];

export default function Navbar() {
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!query) return setSuggestions([]);
    const t = setTimeout(async () => {
      const { data } = await api.get(`/movies/suggestions?q=${query}`);
      setSuggestions(data);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button className="md:hidden" onClick={() => setOpen((v) => !v)}><Menu /></button>
        <Link to="/" className="text-xl font-bold text-violet-400">QuantumFlix</Link>
        <nav className={`${open ? "flex" : "hidden"} md:flex gap-4 text-sm`}>
          {links.map((l) => <Link key={l} to={l === "Home" ? "/" : `/${l.toLowerCase().replace(/ /g, "-")}`} className="hover:text-violet-300">{l}</Link>)}
        </nav>
        <div className="relative ml-auto hidden md:block">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-300" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-full bg-white/10 py-2 pl-8 pr-3 text-sm outline-none" placeholder="Search movies..." />
          {!!suggestions.length && (
            <div className="absolute mt-2 w-full rounded-xl bg-slate-900 p-2 shadow-xl">
              {suggestions.map((s) => <Link key={s._id} to={`/movies/${s._id}`} className="block rounded p-2 hover:bg-white/10">{s.title} ({s.year})</Link>)}
            </div>
          )}
        </div>
        <button className="rounded-full bg-white/10 p-2" onClick={() => setDark((v) => !v)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        <div className="relative group">
          <button className="h-9 w-9 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500">{user?.name?.[0] || "U"}</button>
          <div className="invisible absolute right-0 mt-2 w-40 rounded-xl bg-slate-900 p-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
            {!user && <Link to="/profile" className="block rounded p-2 hover:bg-white/10">Login</Link>}
            {user && <Link to="/profile" className="block rounded p-2 hover:bg-white/10">Profile</Link>}
            {user && <button onClick={logout} className="block w-full rounded p-2 text-left hover:bg-white/10">Logout</button>}
          </div>
        </div>
      </div>
    </header>
  );
}
