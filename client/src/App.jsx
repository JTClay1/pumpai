import { Navigate, Route, Routes } from "react-router-dom";

import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import DailyInput from "./pages/DailyInput";
import History from "./pages/History";
import CoachCorner from "./pages/CoachCorner";
import NotFound from "./pages/NotFound";

import "./App.css";

function App() {
  return (
    <div className="app">
      <NavBar />

      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />

          <Route path="/profile" element={<Profile />} />
          <Route path="/daily-input" element={<DailyInput />} />
          <Route path="/history" element={<History />} />
          <Route path="/coach" element={<CoachCorner />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;