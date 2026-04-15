import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  }

  async function signup(name, email, password) {
    const { data } = await api.post("/auth/signup", { name, email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  }

  async function loadMe() {
    try {
      const { data } = await api.get("/users/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, signup, loadMe, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
