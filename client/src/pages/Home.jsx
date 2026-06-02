import Logo from "../components/Logo";

const features = [
  {
    title: "Track Your Meals",
    description:
      "Use Daily Input to log meals all at once or ingredient by ingredient with the meal builder.",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Build Repeat Logs",
    description:
      "Save meals and ingredients to Easy Log so frequent foods are only one click away.",
    image:
      "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Review Your History",
    description:
      "See food, workouts, rest days, and coach responses grouped into clean daily cards.",
    image:
      "https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Ask Coach’s Corner",
    description:
      "Get AI-powered feedback based on your saved profile, logs, and backend-calculated nutrition summary.",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  },
];

function Home() {
  return (
    <section className="home-page">
      <div className="page-card home-hero">
        <p className="eyebrow">Fitness tracking meets AI feedback</p>
        <Logo className="site-logo hero-logo" />
        <p>
          Track meals, workouts, rest days, and coaching feedback in one place —
          then let PumpAI turn your saved data into useful fitness insight.
        </p>
      </div>

      <section className="home-feature-grid">
        {features.map((feature) => (
          <article
            className="home-feature-card"
            key={feature.title}
            style={{ backgroundImage: `url(${feature.image})` }}
          >
            <div className="home-feature-overlay">
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="page-card home-summary-card">
        <p className="eyebrow">Built around your daily loop</p>
        <h2>Log it. Review it. Learn from it.</h2>
        <p>
          PumpAI combines structured tracking with AI coaching, so your food and
          workout history becomes more than a list — it becomes feedback you can
          actually use.
        </p>
      </section>
    </section>
  );
}

export default Home;