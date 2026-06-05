import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5555";

function formatWorkoutDetails(workout) {
  // Each workout type displays the fields that matter for that activity.
  if (workout.workout_type === "rest") {
    return workout.notes || "Recovery day";
  }

  if (workout.workout_type === "cardio") {
    const duration = workout.duration_minutes
      ? `${workout.duration_minutes} min`
      : null;
    const distance = workout.distance_miles
      ? `${workout.distance_miles} mi`
      : null;

    return [duration, distance].filter(Boolean).join(" · ") || "Cardio";
  }

  const weight = workout.weight ? `${workout.weight} lb` : null;
  const sets = workout.sets ? `${workout.sets} sets` : null;
  const reps = workout.reps ? `${workout.reps} reps` : null;

  return [weight, sets, reps].filter(Boolean).join(" · ") || "Weighted";
}

function formatDate(dateString) {
  if (!dateString) return "No date";

  const [year, month, day] = dateString.split("-");

  return `${Number(month)}/${Number(day)}/${year}`;
}

function groupFoodLogsByDate(foodLogs) {
  // Turn flat API rows into date buckets with daily macro totals.
  return foodLogs.reduce((groups, food) => {
    const date = food.logged_date || "No date";

    if (!groups[date]) {
      groups[date] = {
        date,
        totals: {
          calories: 0,
          fat: 0,
          carbs: 0,
          protein: 0,
        },
        entries: [],
      };
    }

    groups[date].totals.calories += Number(food.calories) || 0;
    groups[date].totals.fat += Number(food.fat) || 0;
    groups[date].totals.carbs += Number(food.carbs) || 0;
    groups[date].totals.protein += Number(food.protein) || 0;
    groups[date].entries.push(food);

    return groups;
  }, {});
}

function groupWorkoutLogsByDate(workoutLogs) {
  // Turn flat workout rows into date buckets with type counts.
  return workoutLogs.reduce((groups, workout) => {
    const date = workout.logged_date || "No date";

    if (!groups[date]) {
      groups[date] = {
        date,
        totals: {
          entries: 0,
          cardio: 0,
          weighted: 0,
          rest: 0,
        },
        entries: [],
      };
    }

    groups[date].totals.entries += 1;

    if (workout.workout_type === "cardio") {
      groups[date].totals.cardio += 1;
    }

    if (workout.workout_type === "weighted") {
      groups[date].totals.weighted += 1;
    }

    if (workout.workout_type === "rest") {
      groups[date].totals.rest += 1;
    }

    groups[date].entries.push(workout);

    return groups;
  }, {});
}

function FoodDayCard({ day, isOpen, onToggle }) {
  return (
    <li className="day-card">
      <button className="day-card-header" type="button" onClick={onToggle}>
        <span>
          <strong>{formatDate(day.date)}</strong>
          <small>{day.entries.length} food entries</small>
        </span>

        <span className="day-card-summary">
          {day.totals.calories} cal · {day.totals.fat}g fat ·{" "}
          {day.totals.carbs}g carbs · {day.totals.protein}g protein
        </span>

        <span className={`day-card-arrow ${isOpen ? "open" : ""}`}>⌄</span>
      </button>

      {isOpen ? (
        <div className="day-card-body">
          <h3>{formatDate(day.date)}</h3>

          <ul className="day-entry-list">
            {day.entries.map((food) => (
              <li key={food.id}>
                <strong>{food.food_name}</strong>
                <span>
                  {food.calories} cal · {food.fat || 0}g fat ·{" "}
                  {food.carbs || 0}g carbs · {food.protein || 0}g protein
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function WorkoutDayCard({ day, isOpen, onToggle }) {
  return (
    <li className="day-card">
      <button className="day-card-header" type="button" onClick={onToggle}>
        <span>
          <strong>{formatDate(day.date)}</strong>
          <small>{day.totals.entries} workout entries</small>
        </span>

        <span className="day-card-summary">
          {day.totals.cardio} cardio · {day.totals.weighted} weighted ·{" "}
          {day.totals.rest} rest
        </span>

        <span className={`day-card-arrow ${isOpen ? "open" : ""}`}>⌄</span>
      </button>

      {isOpen ? (
        <div className="day-card-body">
          <h3>{formatDate(day.date)}</h3>

          <ul className="day-entry-list">
            {day.entries.map((workout) => (
              <li key={workout.id}>
                <strong>{workout.exercise_name}</strong>
                <span>
                  <span className={`type-badge ${workout.workout_type}`}>
                    {workout.workout_type}
                  </span>{" "}
                  {formatWorkoutDetails(workout)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function History() {
  const [history, setHistory] = useState(null);
  const [openFoodDates, setOpenFoodDates] = useState({});
  const [openWorkoutDates, setOpenWorkoutDates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // The history endpoint returns profile, logs, coach responses, and counts.
    fetch(`${API_URL}/history`, {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) return response.json();

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to load history.");
        });
      })
      .then((data) => setHistory(data))
      .catch((error) => setError(error.message))
      .finally(() => setIsLoading(false));
  }, []);

  function toggleFoodDate(date) {
    // Open state is stored by date so each day card expands independently.
    setOpenFoodDates({
      ...openFoodDates,
      [date]: !openFoodDates[date],
    });
  }

  function toggleWorkoutDate(date) {
    setOpenWorkoutDates({
      ...openWorkoutDates,
      [date]: !openWorkoutDates[date],
    });
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>History</h1>
        <p>Loading your history...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>History</h1>
        <p className="form-error">{error}</p>
      </section>
    );
  }

  const profile = history?.profile;
  const foodLogs = history?.food_logs || [];
  const workoutLogs = history?.workout_logs || [];
  const coachResponses = history?.coach_responses || [];
  const totals = history?.totals || {};

  const foodDays = Object.values(groupFoodLogsByDate(foodLogs)).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const workoutDays = Object.values(groupWorkoutLogsByDate(workoutLogs)).sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  return (
    <section className="history-page">
      <div className="page-card history-hero">
        <p className="eyebrow">Saved activity</p>
        <h1>History</h1>
        <p>
          Review your profile, food logs, workouts, rest days, and saved coach
          feedback in one place.
        </p>
      </div>

      <div className="history-stats">
        <article className="stat-card">
          <span>Food Logs</span>
          <strong>{totals.food_logs || 0}</strong>
        </article>

        <article className="stat-card">
          <span>Workout Logs</span>
          <strong>{totals.workout_logs || 0}</strong>
        </article>

        <article className="stat-card">
          <span>Coach Responses</span>
          <strong>{totals.coach_responses || 0}</strong>
        </article>
      </div>

      <section className="page-card history-section">
        <h2>Profile Snapshot</h2>

        {profile ? (
          <div className="profile-snapshot-grid">
            <div>
              <span>Name</span>
              <strong>{profile.name || "Not set"}</strong>
            </div>

            <div>
              <span>Goal</span>
              <strong>{profile.fitness_goal || "Not set"}</strong>
            </div>

            <div>
              <span>Current Weight</span>
              <strong>
                {profile.current_weight
                  ? `${profile.current_weight} ${profile.weight_unit || "lb"}`
                  : "Not set"}
              </strong>
            </div>

            <div>
              <span>Calories</span>
              <strong>{profile.target_calories || "Not set"}</strong>
            </div>

            <div>
              <span>Protein</span>
              <strong>
                {profile.target_protein
                  ? `${profile.target_protein}g`
                  : "Not set"}
              </strong>
            </div>

            <div>
              <span>Coaching Style</span>
              <strong>{profile.coaching_style || "Not set"}</strong>
            </div>
          </div>
        ) : (
          <p>No profile has been created yet.</p>
        )}
      </section>

      <section className="page-card history-section">
        <h2>Food Logs by Day</h2>

        {foodDays.length > 0 ? (
          <ul className="day-card-list">
            {foodDays.map((day) => (
              <FoodDayCard
                key={day.date}
                day={day}
                isOpen={!!openFoodDates[day.date]}
                onToggle={() => toggleFoodDate(day.date)}
              />
            ))}
          </ul>
        ) : (
          <p>No food logs yet.</p>
        )}
      </section>

      <section className="page-card history-section">
        <h2>Workout Logs by Day</h2>

        {workoutDays.length > 0 ? (
          <ul className="day-card-list">
            {workoutDays.map((day) => (
              <WorkoutDayCard
                key={day.date}
                day={day}
                isOpen={!!openWorkoutDates[day.date]}
                onToggle={() => toggleWorkoutDate(day.date)}
              />
            ))}
          </ul>
        ) : (
          <p>No workout logs yet.</p>
        )}
      </section>

      <section className="page-card history-section">
        <h2>Saved Coach Responses</h2>

        {coachResponses.length > 0 ? (
          <ul className="coach-response-list">
            {coachResponses.map((response) => (
              <li key={response.id}>
                <div>
                  <strong>{response.request_type}</strong>
                  <span>{response.created_at}</span>
                </div>

                <p>{response.response_text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No coach responses saved yet.</p>
        )}
      </section>
    </section>
  );
}

export default History;
