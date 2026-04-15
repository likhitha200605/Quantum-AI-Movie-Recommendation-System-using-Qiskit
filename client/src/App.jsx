import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoadingSkeleton from "./components/LoadingSkeleton";
import { useAuth } from "./context/AuthContext";

const HomePage = lazy(() => import("./pages/HomePage"));
const MoviesPage = lazy(() => import("./pages/MoviesPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const QuantumLabPage = lazy(() => import("./pages/QuantumLabPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const MovieDetailsPage = lazy(() => import("./pages/MovieDetailsPage"));

export default function App() {
  const { loadMe } = useAuth();
  useEffect(() => {
    loadMe();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl p-4">
        <Suspense fallback={<LoadingSkeleton rows={6} />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movies/:id" element={<MovieDetailsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/quantum-lab" element={<QuantumLabPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
