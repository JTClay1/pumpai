import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:5555";

function Auth({ setCurrentUser }) {
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleLoginChange(event) {
    setLoginForm({
      ...loginForm,
      [event.target.name]: event.target.value,
    });
  }

  function handleSignupChange(event) {
    setSignupForm({
      ...signupForm,
      [event.target.name]: event.target.value,
    });
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(loginForm),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }

        return response.json().then((data) => {
          throw new Error(data.error || "Login failed.");
        });
      })
      .then((user) => {
        setCurrentUser(user);
        setMessage("Login successful.");
        navigate("/history");
      })
      .catch((error) => setError(error.message));
  }

  function handleSignupSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(signupForm),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }

        return response.json().then((data) => {
          throw new Error(data.error || "Signup failed.");
        });
      })
      .then((user) => {
        setCurrentUser(user);
        setMessage("Account created.");
        navigate("/profile");
      })
      .catch((error) => setError(error.message));
  }

  return (
    <section className="auth-page">
      <div className="auth-intro">
        <p className="eyebrow">Start tracking smarter</p>
        <h1>Welcome to PumpAI</h1>
        <p>
          Log in to continue your fitness tracking streak, or create an account
          to start building your profile, food logs, workouts, and coaching
          history.
        </p>

        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-message">{message}</p> : null}
      </div>

      <div className="auth-panel">
        <form className="auth-card login-card" onSubmit={handleLoginSubmit}>
          <h2>Login</h2>
          <p>Already have an account? Jump back into your dashboard.</p>

          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            placeholder="testuser"
            value={loginForm.username}
            onChange={handleLoginChange}
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            placeholder="password123"
            value={loginForm.password}
            onChange={handleLoginChange}
          />

          <button type="submit">Log In</button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form className="auth-card signup-card" onSubmit={handleSignupSubmit}>
          <h2>Signup</h2>
          <p>New here? Create your PumpAI account and start logging.</p>

          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            name="username"
            type="text"
            placeholder="Choose a username"
            value={signupForm.username}
            onChange={handleSignupChange}
          />

          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={signupForm.email}
            onChange={handleSignupChange}
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            placeholder="Minimum 6 characters"
            value={signupForm.password}
            onChange={handleSignupChange}
          />

          <button type="submit">Create Account</button>
        </form>
      </div>
    </section>
  );
}

export default Auth;