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
import TutorialOverlay from "./components/TutorialOverlay";

import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5555";

// Holds protected routes until the cookie-backed session check has finished.
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
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Restore an existing server session so refreshes keep the user signed in.
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

  function openTutorial() {
    setShowTutorial(true);
  }

  return (
    <div className="app">
      <NavBar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenTutorial={openTutorial}
      />

      <TutorialOverlay
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    
      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Authenticated users should not return to the login/signup page. */}
          <Route
            path="/auth"
            element={
              currentUser ? (
                <Navigate to="/profile" replace />
              ) : (
                <Auth setCurrentUser={setCurrentUser} onOpenTutorial={openTutorial} />
              )
            }
          />

          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />

          {/* Main app screens require an active session before rendering. */}
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
