import { NavLink } from "react-router-dom";

function NavBar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        PumpAI
      </NavLink>

      <nav className="nav-links">
        <NavLink to="/profile">Profile</NavLink>
        <NavLink to="/daily-input">Daily Input</NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/coach">Coach’s Corner</NavLink>

        <NavLink
          to="/auth"
          className={({ isActive }) =>
            isActive ? "auth-pill active" : "auth-pill"
          }
        >
          Login / Signup
        </NavLink>
      </nav>
    </header>
  );
}

export default NavBar;