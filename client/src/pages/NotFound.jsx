import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section className="page-card">
      <h1>404</h1>
      <p>This page does not exist.</p>
      <Link to="/">Return home</Link>
    </section>
  );
}

export default NotFound;