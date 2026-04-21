import { Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const links = ["Home", "Movies", "Recommendations", "Quantum Lab", "Dashboard", "Profile"];

export default function Navbar() {
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") return true;
    if (savedTheme === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  });
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const { data } = await api.get(`/movies/suggestions?q=${encodeURIComponent(query)}`);
        setSuggestions(data);
      } catch (err) {
        console.error("Search error:", err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onDocumentClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    setSuggestions([]);
    navigate(`/search?q=${encodeURIComponent(clean)}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button className="md:hidden" onClick={() => setOpen((v) => !v)}><Menu /></button>
        <Link to="/" className="text-xl font-bold text-violet-400">QuantumFlix</Link>
        <nav className={`${open ? "flex" : "hidden"} md:flex gap-4 text-sm`}>
          {links.map((l) => <Link key={l} to={l === "Home" ? "/" : `/${l.toLowerCase().replace(/ /g, "-")}`} className="text-slate-700 hover:text-violet-500 dark:text-slate-100 dark:hover:text-violet-300">{l}</Link>)}
        </nav>
        <form className="relative z-[70] ml-auto hidden md:block" onSubmit={submitSearch}>
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-300" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-full border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-white/10 dark:text-slate-100" placeholder="Search movies..." />
          {(loadingSuggestions || !!suggestions.length) && (
            <div className="absolute z-[80] mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
              {loadingSuggestions && <p className="p-2 text-sm text-slate-500 dark:text-slate-300">Loading suggestions...</p>}
              {suggestions.map((s) => <Link key={s._id} to={`/movies/${s._id}`} className="block rounded p-2 hover:bg-slate-100 dark:hover:bg-white/10">{s.title} ({s.year})</Link>)}
            </div>
          )}
        </form>
        <button className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-white/10 dark:text-slate-100" onClick={() => setDark((v) => !v)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        <div className="relative" ref={profileMenuRef}>
          <button onClick={() => setProfileMenuOpen((v) => !v)} className="h-9 w-9 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500">
            {user?.name?.[0] || "U"}
          </button>
          <div className={`${profileMenuOpen ? "visible opacity-100" : "invisible opacity-0"} absolute right-0 z-[120] mt-2 w-40 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 transition dark:border-white/10 dark:bg-slate-900 dark:text-slate-100`}>
            {!user && <Link to="/profile" onClick={() => setProfileMenuOpen(false)} className="block rounded p-2 hover:bg-slate-100 dark:hover:bg-white/10">Login</Link>}
            {user && <Link to="/profile" onClick={() => setProfileMenuOpen(false)} className="block rounded p-2 hover:bg-slate-100 dark:hover:bg-white/10">Profile</Link>}
            {user && <button onClick={() => { setProfileMenuOpen(false); logout(); }} className="block w-full rounded p-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">Logout</button>}
          </div>
        </div>
      </div>
    </header>
  );
}
