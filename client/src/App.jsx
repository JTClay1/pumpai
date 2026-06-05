import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import DailyInput from "./pages/DailyInput";
import History from "./pages/History";
import CoachCorner from "./pages/CoachCorner";
import NotFound from "./pages/NotFound";

import "./App.css";

const API_URL = "http://127.0.0.1:5555";

function RequireAuth({ currentUser, isLoading, children }) {
  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Loading...</h1>
        <p>Checking your session.</p>
      </section>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/check_session`, {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }

        throw new Error("No active session");
      })
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  function handleLogout() {
    fetch(`${API_URL}/logout`, {
      method: "DELETE",
      credentials: "include",
    }).then(() => setCurrentUser(null));
  }

  return (
    <div className="app">
      <NavBar currentUser={currentUser} onLogout={handleLogout} />

      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/auth"
            element={
              currentUser ? (
                <Navigate to="/history" replace />
              ) : (
                <Auth setCurrentUser={setCurrentUser} />
              )
            }
          />

          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />

          <Route
            path="/profile"
            element={
              <RequireAuth currentUser={currentUser} isLoading={isLoading}>
                <Profile currentUser={currentUser} setCurrentUser={setCurrentUser} />
              </RequireAuth>
            }
          />

          <Route
            path="/daily-input"
            element={
              <RequireAuth currentUser={currentUser} isLoading={isLoading}>
                <DailyInput />
              </RequireAuth>
            }
          />

          <Route
            path="/history"
            element={
              <RequireAuth currentUser={currentUser} isLoading={isLoading}>
                <History />
              </RequireAuth>
            }
          />

          <Route
            path="/coach"
            element={
              <RequireAuth currentUser={currentUser} isLoading={isLoading}>
                <CoachCorner />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;