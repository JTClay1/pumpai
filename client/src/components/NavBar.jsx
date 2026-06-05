import { NavLink } from "react-router-dom";
import Logo from "./Logo";

function NavBar({ currentUser, onLogout, onOpenTutorial }) {
  return (
    <header className="navbar">
      <NavLink to="/" className="brand" aria-label="PumpAI home">
        <Logo className="site-logo nav-logo" />
      </NavLink>

      <nav className="nav-links">
        <NavLink to="/profile">Profile</NavLink>
        <NavLink to="/daily-input">Daily Input</NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/coach">Coach’s Corner</NavLink>

        {currentUser ? (
          <>
            <button
              className="tutorial-nav-button"
              type="button"
              onClick={onOpenTutorial}
            >
              Tutorial
            </button>

            <span className="user-pill">{currentUser.username}</span>

            <button className="logout-button" type="button" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <NavLink
            to="/auth"
            className={({ isActive }) =>
              isActive ? "auth-pill active" : "auth-pill"
            }
          >
            Login / Signup
          </NavLink>
        )}
      </nav>
    </header>
  );
}

export default NavBar;