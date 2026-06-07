import { Menu, Moon, Search, Sun, User, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { trackSearchAction } from "../services/tracking";

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
  const [searchExpanded, setSearchExpanded] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const inputRef = useRef(null);

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
    const clean = query.trim();
    if (!clean) return;
    const t = setTimeout(() => {
      trackSearchAction({ userId: user?._id, query: clean });
    }, 500);
    return () => clearTimeout(t);
  }, [query, user?._id]);

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
    trackSearchAction({ userId: user?._id, query: clean });
    setSuggestions([]);
    setSearchExpanded(false);
    navigate(`/search?q=${encodeURIComponent(clean)}`);
  }

  const toggleSearch = () => {
    setSearchExpanded(prev => !prev);
    if (!searchExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#07080a]/60 backdrop-blur-xl border-b border-white/5 w-full">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 md:px-8 py-4">
        {/* Mobile menu trigger */}
        <button 
          className="md:hidden text-slate-300 hover:text-white" 
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle Menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link 
          to="/" 
          className="text-xl font-black tracking-tighter text-white hover:text-indigo-400 transition-colors uppercase font-sans shrink-0"
        >
          Quantum<span className="text-indigo-500 font-medium lowercase">Flix</span>
        </Link>

        {/* Desktop Nav links */}
        <nav className={`${open ? "flex absolute top-full left-0 right-0 bg-[#07080a]/95 border-b border-white/5 p-4 flex-col space-y-4" : "hidden"} md:flex md:relative md:top-auto md:bg-transparent md:border-0 md:p-0 md:flex-row md:space-y-0 md:items-center gap-6 text-xs font-semibold tracking-wider text-slate-300`}>
          {links.map((l) => (
            <Link 
              key={l} 
              to={l === "Home" ? "/" : `/${l.toLowerCase().replace(/ /g, "-")}`} 
              onClick={() => setOpen(false)}
              className="hover:text-white transition-colors duration-200"
            >
              {l}
            </Link>
          ))}
        </nav>

        {/* Expandable Search and Profile */}
        <div className="flex items-center gap-4 ml-auto shrink-0">
          <form className="relative z-50 flex items-center" onSubmit={submitSearch}>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden transition-all duration-300">
              <button 
                type="button" 
                onClick={toggleSearch} 
                className="p-2 text-slate-300 hover:text-white transition-colors focus:outline-none"
                aria-label="Expand Search"
              >
                <Search size={16} />
              </button>
              <input 
                ref={inputRef}
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                onBlur={() => {
                  if (!query.trim()) setSearchExpanded(false);
                }}
                className={`bg-transparent text-xs text-white outline-none transition-all duration-300 placeholder:text-slate-400 ${
                  searchExpanded ? "w-36 md:w-56 px-2 py-1 opacity-100" : "w-0 opacity-0 pointer-events-none"
                }`} 
                placeholder="Search movies..." 
              />
            </div>
            
            {/* Search Suggestions */}
            {(loadingSuggestions || !!suggestions.length) && searchExpanded && (
              <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#07080a]/90 backdrop-blur-xl p-2 text-slate-100 shadow-2xl">
                {loadingSuggestions && <p className="p-2 text-xs text-slate-400">Loading suggestions...</p>}
                {suggestions.map((s) => (
                  <Link 
                    key={s._id} 
                    to={`/movies/${s._id}`} 
                    onClick={() => {
                      setQuery("");
                      setSearchExpanded(false);
                    }}
                    className="block rounded-lg p-2 text-xs hover:bg-white/10 transition-colors"
                  >
                    {s.title} ({s.year})
                  </Link>
                ))}
              </div>
            )}
          </form>

          {/* Theme switcher (Glassmorphic) */}
          <button 
            className="rounded-full bg-white/5 border border-white/10 p-2 text-slate-300 hover:text-white transition-colors focus:outline-none hidden sm:block" 
            onClick={() => setDark((v) => !v)}
            title="Toggle Theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Profile Dropdown (Borderless / Premium Glassmorphic) */}
          <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setProfileMenuOpen((v) => !v)} 
              className="h-8 w-8 rounded-full ring-2 ring-indigo-500/50 hover:ring-indigo-400 transition-all cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase focus:outline-none"
              aria-label="Profile Menu"
            >
              {user?.name?.[0] || "U"}
            </button>
            <div 
              className={`${
                profileMenuOpen ? "visible opacity-100 scale-100" : "invisible opacity-0 scale-95"
              } absolute right-0 z-[120] mt-3 w-44 rounded-lg bg-[#07080a]/95 backdrop-blur-xl p-1 text-slate-200 transition-all duration-150 origin-top-right ring-1 ring-white/10 shadow-2xl border-0`}
            >
              {!user ? (
                <Link 
                  to="/profile" 
                  onClick={() => setProfileMenuOpen(false)} 
                  className="flex items-center gap-2 rounded-md p-2 text-xs font-semibold hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  <User size={14} /> Login / Register
                </Link>
              ) : (
                <>
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed In As</p>
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  </div>
                  <Link 
                    to="/profile" 
                    onClick={() => setProfileMenuOpen(false)} 
                    className="flex items-center gap-2 rounded-md p-2 text-xs font-semibold hover:bg-white/10 text-slate-300 hover:text-white transition-colors mt-1"
                  >
                    <User size={14} /> Profile
                  </Link>
                  <button 
                    onClick={() => { setProfileMenuOpen(false); logout(); }} 
                    className="flex w-full items-center gap-2 rounded-md p-2 text-xs font-semibold hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors text-left"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
