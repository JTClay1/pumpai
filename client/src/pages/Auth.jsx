function Auth() {
  function handleSubmit(event) {
    event.preventDefault();
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
      </div>

      <div className="auth-panel">
        <form className="auth-card login-card" onSubmit={handleSubmit}>
          <h2>Login</h2>
          <p>Already have an account? Jump back into your dashboard.</p>

          <label htmlFor="login-username">Username</label>
          <input id="login-username" type="text" placeholder="testuser" />

          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" placeholder="password123" />

          <button type="submit">Log In</button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form className="auth-card signup-card" onSubmit={handleSubmit}>
          <h2>Signup</h2>
          <p>New here? Create your PumpAI account and start logging.</p>

          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            type="text"
            placeholder="Choose a username"
          />

          <label htmlFor="signup-email">Email</label>
          <input id="signup-email" type="email" placeholder="you@example.com" />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            placeholder="Minimum 6 characters"
          />

          <button type="submit">Create Account</button>
        </form>
      </div>
    </section>
  );
}

export default Auth;