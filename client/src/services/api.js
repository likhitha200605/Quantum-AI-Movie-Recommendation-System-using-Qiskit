import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/profile") {
        window.location.href = "/profile";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
