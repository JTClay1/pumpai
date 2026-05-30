import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5555";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

const emptyFoodForm = {
  food_name: "",
  calories: "",
  servings: "1",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  sodium: "",
  serving_size: "",
  logged_date: getTodayDate(),
};

const emptyWorkoutForm = {
  workout_type: "cardio",
  exercise_name: "",
  duration_minutes: "",
  distance_miles: "",
  weight: "",
  sets: "",
  reps: "",
  notes: "",
  logged_date: getTodayDate(),
};

function toNumberOrNull(value) {
  return value === "" ? null : Number(value);
}

function DailyInput() {
  const [foodForm, setFoodForm] = useState(emptyFoodForm);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [foodLogs, setFoodLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentLogs();
  }, []);

  function loadRecentLogs() {
    setIsLoading(true);

    Promise.all([
      fetch(`${API_URL}/food_logs?page=1&per_page=5`, {
        credentials: "include",
      }),
      fetch(`${API_URL}/workout_logs?page=1&per_page=5`, {
        credentials: "include",
      }),
    ])
      .then(([foodResponse, workoutResponse]) => {
        if (!foodResponse.ok || !workoutResponse.ok) {
          throw new Error("Unable to load recent logs.");
        }

        return Promise.all([foodResponse.json(), workoutResponse.json()]);
      })
      .then(([foodData, workoutData]) => {
        setFoodLogs(foodData.food_logs || []);
        setWorkoutLogs(workoutData.workout_logs || []);
      })
      .catch((error) => setError(error.message))
      .finally(() => setIsLoading(false));
  }

  function handleFoodChange(event) {
    setFoodForm({
      ...foodForm,
      [event.target.name]: event.target.value,
    });
  }

  function handleWorkoutChange(event) {
    const { name, value } = event.target;

    if (name === "workout_type") {
      setWorkoutForm({
        ...workoutForm,
        workout_type: value,
        exercise_name: value === "rest" ? "Rest Day" : "",
        duration_minutes: "",
        distance_miles: "",
        weight: "",
        sets: "",
        reps: "",
      });

      return;
    }

    setWorkoutForm({
      ...workoutForm,
      [name]: value,
    });
  }

  function buildFoodPayload() {
    return {
      food_name: foodForm.food_name,
      calories: Number(foodForm.calories),
      servings: Number(foodForm.servings),
      protein: toNumberOrNull(foodForm.protein),
      carbs: toNumberOrNull(foodForm.carbs),
      fat: toNumberOrNull(foodForm.fat),
      fiber: toNumberOrNull(foodForm.fiber),
      sodium: toNumberOrNull(foodForm.sodium),
      serving_size: foodForm.serving_size,
      logged_date: foodForm.logged_date,
    };
  }

  function buildWorkoutPayload() {
    if (workoutForm.workout_type === "rest") {
      return {
        workout_type: "rest",
        exercise_name: "Rest Day",
        duration_minutes: null,
        distance_miles: null,
        weight: null,
        sets: null,
        reps: null,
        notes: workoutForm.notes,
        logged_date: workoutForm.logged_date,
      };
    }

    return {
      workout_type: workoutForm.workout_type,
      exercise_name: workoutForm.exercise_name,
      duration_minutes: toNumberOrNull(workoutForm.duration_minutes),
      distance_miles: toNumberOrNull(workoutForm.distance_miles),
      weight: toNumberOrNull(workoutForm.weight),
      sets: toNumberOrNull(workoutForm.sets),
      reps: toNumberOrNull(workoutForm.reps),
      notes: workoutForm.notes,
      logged_date: workoutForm.logged_date,
    };
  }

  function handleFoodSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    fetch(`${API_URL}/food_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(buildFoodPayload()),
    })
      .then((response) => {
        if (response.ok) return response.json();

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to save food log.");
        });
      })
      .then(() => {
        setFoodForm({
          ...emptyFoodForm,
          logged_date: getTodayDate(),
        });
        setMessage("Food log saved.");
        loadRecentLogs();
      })
      .catch((error) => setError(error.message));
  }

  function handleWorkoutSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    fetch(`${API_URL}/workout_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(buildWorkoutPayload()),
    })
      .then((response) => {
        if (response.ok) return response.json();

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to save workout log.");
        });
      })
      .then(() => {
        setWorkoutForm({
          ...emptyWorkoutForm,
          logged_date: getTodayDate(),
        });
        setMessage("Workout log saved.");
        loadRecentLogs();
      })
      .catch((error) => setError(error.message));
  }

  return (
    <section className="daily-input-page">
      <div className="page-card daily-hero">
        <p className="eyebrow">Daily tracking</p>
        <h1>Daily Input</h1>
        <p>
          Log food, training, and recovery for the day. PumpAI stores everything
          under your account so your history and future coaching feedback stay
          personalized.
        </p>

        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-message">{message}</p> : null}
      </div>

      <div className="daily-input-grid">
        <section className="page-card input-panel">
          <h2>Food Log</h2>
          <p>Add calories and macros for a meal, snack, or full item.</p>

          <form className="stacked-form" onSubmit={handleFoodSubmit}>
            <div className="form-field">
              <label htmlFor="food_name">Food Name</label>
              <input
                id="food_name"
                name="food_name"
                type="text"
                value={foodForm.food_name}
                onChange={handleFoodChange}
                placeholder="Chicken rice bowl"
                required
              />
            </div>

            <div className="form-grid compact-grid">
              <div className="form-field">
                <label htmlFor="calories">Calories</label>
                <input
                  id="calories"
                  name="calories"
                  type="number"
                  min="0"
                  value={foodForm.calories}
                  onChange={handleFoodChange}
                  placeholder="650"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="servings">Servings</label>
                <input
                  id="servings"
                  name="servings"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={foodForm.servings}
                  onChange={handleFoodChange}
                  placeholder="1"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="protein">Protein</label>
                <input
                  id="protein"
                  name="protein"
                  type="number"
                  min="0"
                  step="0.1"
                  value={foodForm.protein}
                  onChange={handleFoodChange}
                  placeholder="55"
                />
              </div>

              <div className="form-field">
                <label htmlFor="carbs">Carbs</label>
                <input
                  id="carbs"
                  name="carbs"
                  type="number"
                  min="0"
                  step="0.1"
                  value={foodForm.carbs}
                  onChange={handleFoodChange}
                  placeholder="60"
                />
              </div>

              <div className="form-field">
                <label htmlFor="fat">Fat</label>
                <input
                  id="fat"
                  name="fat"
                  type="number"
                  min="0"
                  step="0.1"
                  value={foodForm.fat}
                  onChange={handleFoodChange}
                  placeholder="18"
                />
              </div>

              <div className="form-field">
                <label htmlFor="fiber">Fiber</label>
                <input
                  id="fiber"
                  name="fiber"
                  type="number"
                  min="0"
                  step="0.1"
                  value={foodForm.fiber}
                  onChange={handleFoodChange}
                  placeholder="6"
                />
              </div>

              <div className="form-field">
                <label htmlFor="sodium">Sodium</label>
                <input
                  id="sodium"
                  name="sodium"
                  type="number"
                  min="0"
                  step="0.1"
                  value={foodForm.sodium}
                  onChange={handleFoodChange}
                  placeholder="900"
                />
              </div>

              <div className="form-field">
                <label htmlFor="logged_date">Date</label>
                <input
                  id="logged_date"
                  name="logged_date"
                  type="date"
                  value={foodForm.logged_date}
                  onChange={handleFoodChange}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="serving_size">Serving Size</label>
              <input
                id="serving_size"
                name="serving_size"
                type="text"
                value={foodForm.serving_size}
                onChange={handleFoodChange}
                placeholder="1 bowl"
              />
            </div>

            <button className="primary-action" type="submit">
              Save Food Log
            </button>
          </form>
        </section>

        <section className="page-card input-panel">
          <h2>Workout Log</h2>
          <p>
            Add cardio, weighted training, or a rest day so your activity history
            stays current.
          </p>

          <form className="stacked-form" onSubmit={handleWorkoutSubmit}>
            <div className="form-grid compact-grid">
              <div className="form-field">
                <label htmlFor="workout_type">Workout Type</label>
                <select
                  id="workout_type"
                  name="workout_type"
                  value={workoutForm.workout_type}
                  onChange={handleWorkoutChange}
                >
                  <option value="cardio">Cardio</option>
                  <option value="weighted">Weighted</option>
                  <option value="rest">Rest Day</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="workout_date">Date</label>
                <input
                  id="workout_date"
                  name="logged_date"
                  type="date"
                  value={workoutForm.logged_date}
                  onChange={handleWorkoutChange}
                  required
                />
              </div>
            </div>

            {workoutForm.workout_type !== "rest" ? (
              <div className="form-field">
                <label htmlFor="exercise_name">Exercise Name</label>
                <input
                  id="exercise_name"
                  name="exercise_name"
                  type="text"
                  value={workoutForm.exercise_name}
                  onChange={handleWorkoutChange}
                  placeholder={
                    workoutForm.workout_type === "cardio"
                      ? "Treadmill walk"
                      : "Dumbbell bench press"
                  }
                  required
                />
              </div>
            ) : (
              <div className="rest-day-callout">
                <strong>Rest Day: </strong>
                <span>
                  Recovery counts. Add notes about soreness, sleep, steps, or
                  how your body feels today.
                </span>
              </div>
            )}

            {workoutForm.workout_type === "cardio" ? (
              <div className="form-grid compact-grid">
                <div className="form-field">
                  <label htmlFor="duration_minutes">Duration Minutes</label>
                  <input
                    id="duration_minutes"
                    name="duration_minutes"
                    type="number"
                    min="0"
                    value={workoutForm.duration_minutes}
                    onChange={handleWorkoutChange}
                    placeholder="60"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="distance_miles">Distance Miles</label>
                  <input
                    id="distance_miles"
                    name="distance_miles"
                    type="number"
                    min="0"
                    step="0.01"
                    value={workoutForm.distance_miles}
                    onChange={handleWorkoutChange}
                    placeholder="4.1"
                  />
                </div>
              </div>
            ) : workoutForm.workout_type === "weighted" ? (
              <div className="form-grid compact-grid">
                <div className="form-field">
                  <label htmlFor="weight">Weight</label>
                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={workoutForm.weight}
                    onChange={handleWorkoutChange}
                    placeholder="75"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sets">Sets</label>
                  <input
                    id="sets"
                    name="sets"
                    type="number"
                    min="0"
                    value={workoutForm.sets}
                    onChange={handleWorkoutChange}
                    placeholder="3"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="reps">Reps</label>
                  <input
                    id="reps"
                    name="reps"
                    type="number"
                    min="0"
                    value={workoutForm.reps}
                    onChange={handleWorkoutChange}
                    placeholder="8"
                  />
                </div>
              </div>
            ) : null}

            <div className="form-field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={workoutForm.notes}
                onChange={handleWorkoutChange}
                placeholder={
                  workoutForm.workout_type === "rest"
                    ? "Recovery day. Light walking, stretching, sleep quality..."
                    : "Strong top sets, steady pace, recovery notes..."
                }
                rows="4"
              />
            </div>

            <button className="primary-action" type="submit">
              Save Workout Log
            </button>
          </form>
        </section>
      </div>

      <section className="page-card recent-logs-panel">
        <h2>Recent Logs</h2>

        {isLoading ? (
          <p>Loading recent logs...</p>
        ) : (
          <div className="recent-logs-grid">
            <div>
              <h3>Food</h3>
              {foodLogs.length > 0 ? (
                <ul className="log-list">
                  {foodLogs.map((food) => (
                    <li key={food.id}>
                      <strong>{food.food_name}</strong>
                      <span>
                        {food.calories} cal · {food.protein || 0}g protein ·{" "}
                        {food.logged_date}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No food logs yet.</p>
              )}
            </div>

            <div>
              <h3>Workouts</h3>
              {workoutLogs.length > 0 ? (
                <ul className="log-list">
                  {workoutLogs.map((workout) => (
                    <li key={workout.id}>
                      <strong>{workout.exercise_name}</strong>
                      <span>
                        {workout.workout_type} · {workout.logged_date}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No workout logs yet.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export default DailyInput;