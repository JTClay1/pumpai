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
  add_to_easy_log: false,
};

// Meal ingredients stay flat in the UI and are summed into one FoodLog later.
const emptyIngredient = {
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  sodium: "",
};

const emptyMealForm = {
  meal_name: "",
  serving_size: "",
  logged_date: getTodayDate(),
  add_to_easy_log: false,
  ingredients: [{ ...emptyIngredient }],
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

function getMealTotals(ingredients) {
  // Aggregate each ingredient row into the nutrition totals for a saved meal.
  return ingredients.reduce(
    (totals, ingredient) => {
      totals.calories += Number(ingredient.calories) || 0;
      totals.protein += Number(ingredient.protein) || 0;
      totals.carbs += Number(ingredient.carbs) || 0;
      totals.fat += Number(ingredient.fat) || 0;
      totals.fiber += Number(ingredient.fiber) || 0;
      totals.sodium += Number(ingredient.sodium) || 0;

      return totals;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
    }
  );
}

function DailyInput() {
  const [foodMode, setFoodMode] = useState("single");
  const [foodForm, setFoodForm] = useState(emptyFoodForm);
  const [mealForm, setMealForm] = useState(emptyMealForm);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [foodLogs, setFoodLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [easyLogItems, setEasyLogItems] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPageData();
  }, []);

  function loadPageData() {
    setIsLoading(true);

    // Load recent logs and reusable Easy Log items together for the page dashboard.
    Promise.all([
      fetch(`${API_URL}/food_logs?page=1&per_page=5`, {
        credentials: "include",
      }),
      fetch(`${API_URL}/workout_logs?page=1&per_page=5`, {
        credentials: "include",
      }),
      fetch(`${API_URL}/easy_log_items`, {
        credentials: "include",
      }),
    ])
      .then(([foodResponse, workoutResponse, easyLogResponse]) => {
        if (!foodResponse.ok || !workoutResponse.ok || !easyLogResponse.ok) {
          throw new Error("Unable to load recent logs.");
        }

        return Promise.all([
          foodResponse.json(),
          workoutResponse.json(),
          easyLogResponse.json(),
        ]);
      })
      .then(([foodData, workoutData, easyLogData]) => {
        setFoodLogs(foodData.food_logs || []);
        setWorkoutLogs(workoutData.workout_logs || []);
        setEasyLogItems(easyLogData.easy_log_items || []);
      })
      .catch((error) => setError(error.message))
      .finally(() => setIsLoading(false));
  }

  function handleFoodChange(event) {
    const { name, value, type, checked } = event.target;

    setFoodForm({
      ...foodForm,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  function handleMealChange(event) {
    const { name, value, type, checked } = event.target;

    setMealForm({
      ...mealForm,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  function handleIngredientChange(index, event) {
    const { name, value } = event.target;

    const updatedIngredients = mealForm.ingredients.map((ingredient, i) => {
      if (i === index) {
        return {
          ...ingredient,
          [name]: value,
        };
      }

      return ingredient;
    });

    setMealForm({
      ...mealForm,
      ingredients: updatedIngredients,
    });
  }

  function addIngredient() {
    setMealForm({
      ...mealForm,
      ingredients: [...mealForm.ingredients, { ...emptyIngredient }],
    });
  }

  function removeIngredient(index) {
    if (mealForm.ingredients.length === 1) {
      return;
    }

    setMealForm({
      ...mealForm,
      ingredients: mealForm.ingredients.filter((ingredient, i) => i !== index),
    });
  }

  function addEasyLogItemToMeal(item) {
    setFoodMode("meal");

    // Reusable Easy Log items can be inserted as meal ingredients in one click.
    setMealForm({
      ...mealForm,
      ingredients: [
        ...mealForm.ingredients,
        {
          name: item.name,
          calories: item.calories || "",
          protein: item.protein || "",
          carbs: item.carbs || "",
          fat: item.fat || "",
          fiber: item.fiber || "",
          sodium: item.sodium || "",
        },
      ],
    });

    setMessage(`${item.name} added as an ingredient.`);
    setError("");
  }

  function useEasyLogAsSingleFood(item) {
    setFoodMode("single");

    // Reusable Easy Log items can also prefill the simple food log form.
    setFoodForm({
      food_name: item.name,
      calories: item.calories || "",
      servings: item.servings || "1",
      protein: item.protein || "",
      carbs: item.carbs || "",
      fat: item.fat || "",
      fiber: item.fiber || "",
      sodium: item.sodium || "",
      serving_size: item.serving_size || "",
      logged_date: getTodayDate(),
      add_to_easy_log: false,
    });

    setMessage(`${item.name} loaded into the food form.`);
    setError("");
  }

  function deleteEasyLogItem(id) {
    setError("");
    setMessage("");

    fetch(`${API_URL}/easy_log_items/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          return null;
        }

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to delete easy log item.");
        });
      })
      .then(() => {
        setMessage("Easy Log item deleted.");
        loadPageData();
      })
      .catch((error) => setError(error.message));
  }

  function handleWorkoutChange(event) {
    const { name, value } = event.target;

    if (name === "workout_type") {
      // Switching workout type clears fields that no longer apply to that mode.
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
    // Convert form strings into the numeric/null values expected by the API.
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

  function buildMealPayload() {
    const totals = getMealTotals(mealForm.ingredients);

    // Meals are saved as one food log whose macros come from ingredient totals.
    return {
      food_name: mealForm.meal_name,
      calories: Math.round(totals.calories),
      servings: 1,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      fiber: totals.fiber,
      sodium: totals.sodium,
      serving_size: mealForm.serving_size || "1 meal",
      logged_date: mealForm.logged_date,
    };
  }

  function buildWorkoutPayload() {
    if (workoutForm.workout_type === "rest") {
      // Rest days intentionally omit exercise metrics and keep only notes/date.
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

  function saveEasyLogItem(payload, itemType) {
    // Easy Log stores repeat meals or ingredients separately from daily logs.
    return fetch(`${API_URL}/easy_log_items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name: payload.food_name,
        item_type: itemType,
        calories: payload.calories,
        servings: payload.servings || 1,
        protein: payload.protein,
        carbs: payload.carbs,
        fat: payload.fat,
        fiber: payload.fiber,
        sodium: payload.sodium,
        serving_size: payload.serving_size,
      }),
    }).then((response) => {
      if (response.ok) return response.json();

      return response.json().then((data) => {
        throw new Error(data.error || "Unable to save easy log item.");
      });
    });
  }

  function saveFoodLog(payload) {
    return fetch(`${API_URL}/food_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }).then((response) => {
      if (response.ok) return response.json();

      return response.json().then((data) => {
        throw new Error(data.error || "Unable to save food log.");
      });
    });
  }

  function handleFoodSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = buildFoodPayload();

    // Save the daily log first, then optionally save the same item for reuse.
    saveFoodLog(payload)
      .then(() => {
        if (foodForm.add_to_easy_log) {
          return saveEasyLogItem(payload, "ingredient");
        }

        return null;
      })
      .then(() => {
        setFoodForm({
          ...emptyFoodForm,
          logged_date: getTodayDate(),
        });
        setMessage(
          foodForm.add_to_easy_log
            ? "Food log saved and added to Easy Log."
            : "Food log saved."
        );
        loadPageData();
      })
      .catch((error) => setError(error.message));
  }

  function handleMealSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = buildMealPayload();

    // Meal builder follows the same save flow as single foods.
    saveFoodLog(payload)
      .then(() => {
        if (mealForm.add_to_easy_log) {
          return saveEasyLogItem(payload, "meal");
        }

        return null;
      })
      .then(() => {
        setMealForm({
          ...emptyMealForm,
          logged_date: getTodayDate(),
          ingredients: [{ ...emptyIngredient }],
        });
        setMessage(
          mealForm.add_to_easy_log
            ? "Meal saved and added to Easy Log."
            : "Meal log saved."
        );
        loadPageData();
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
        loadPageData();
      })
      .catch((error) => setError(error.message));
  }

  const mealTotals = getMealTotals(mealForm.ingredients);

  return (
    <section className="daily-input-page">
      <div className="page-card daily-hero">
        <p className="eyebrow">Daily tracking</p>
        <h1>Daily Input</h1>
        <p>
          Log food and workouts for the day. Build meals from ingredients, save
          repeat items to Easy Log, and keep your history clean.
        </p>

        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-message">{message}</p> : null}
      </div>

      <section className="page-card easy-log-panel">
        <div>
          <h2>Easy Log</h2>
          <p>Reuse meals and ingredients you log often.</p>
        </div>

        {easyLogItems.length > 0 ? (
          <div className="easy-log-list">
            {easyLogItems.map((item) => (
              <article key={item.id} className="easy-log-card">
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.item_type} · {item.calories} cal ·{" "}
                    {item.protein || 0}g protein
                  </span>
                </div>

                <div className="easy-log-actions">
                  <button
                    type="button"
                    onClick={() => useEasyLogAsSingleFood(item)}
                  >
                    Use
                  </button>

                  <button
                    type="button"
                    onClick={() => addEasyLogItemToMeal(item)}
                  >
                    Add Ingredient
                  </button>

                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => deleteEasyLogItem(item.id)}
                  >
                    Delete
                 </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No easy log items yet. Check “Add to Easy Log” when saving food.</p>
        )}
      </section>

      <div className="daily-input-grid">
        <section className="page-card input-panel">
          <h2>Food Log</h2>
          <p>Add a single item or build a meal from multiple ingredients.</p>

          <div className="mode-toggle">
            <button
              type="button"
              className={foodMode === "single" ? "active" : ""}
              onClick={() => setFoodMode("single")}
            >
              Single Item
            </button>

            <button
              type="button"
              className={foodMode === "meal" ? "active" : ""}
              onClick={() => setFoodMode("meal")}
            >
              Meal Builder
            </button>
          </div>

          {foodMode === "single" ? (
            <form className="stacked-form" onSubmit={handleFoodSubmit}>
              <div className="form-field">
                <label htmlFor="food_name">Food Name</label>
                <input
                  id="food_name"
                  name="food_name"
                  type="text"
                  value={foodForm.food_name}
                  onChange={handleFoodChange}
                  placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                  placeholder=""
                />
              </div>

              <label className="checkbox-row">
                <input
                  name="add_to_easy_log"
                  type="checkbox"
                  checked={foodForm.add_to_easy_log}
                  onChange={handleFoodChange}
                />
                Add to Easy Log
              </label>

              <button className="primary-action" type="submit">
                Save Food Log
              </button>
            </form>
          ) : (
            <form className="stacked-form" onSubmit={handleMealSubmit}>
              <div className="form-field">
                <label htmlFor="meal_name">Meal Name</label>
                <input
                  id="meal_name"
                  name="meal_name"
                  type="text"
                  value={mealForm.meal_name}
                  onChange={handleMealChange}
                  placeholder=""
                  required
                />
              </div>

              <div className="form-grid compact-grid">
                <div className="form-field">
                  <label htmlFor="meal_date">Date</label>
                  <input
                    id="meal_date"
                    name="logged_date"
                    type="date"
                    value={mealForm.logged_date}
                    onChange={handleMealChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="meal_serving_size">Serving Size</label>
                  <input
                    id="meal_serving_size"
                    name="serving_size"
                    type="text"
                    value={mealForm.serving_size}
                    onChange={handleMealChange}
                    placeholder=""
                  />
                </div>
              </div>

              <div className="ingredient-builder">
                <div className="ingredient-builder-header">
                  <h3>Ingredients</h3>
                  <button type="button" onClick={addIngredient}>
                    Add Ingredient
                  </button>
                </div>

                {mealForm.ingredients.map((ingredient, index) => (
                  <div className="ingredient-card" key={index}>
                    <div className="ingredient-card-header">
                      <strong>Ingredient {index + 1}</strong>

                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="form-field">
                      <label>Name</label>
                      <input
                        name="name"
                        type="text"
                        value={ingredient.name}
                        onChange={(event) =>
                          handleIngredientChange(index, event)
                        }
                        placeholder=""
                        required
                      />
                    </div>

                    <div className="form-grid compact-grid">
                      <div className="form-field">
                        <label>Calories</label>
                        <input
                          name="calories"
                          type="number"
                          min="0"
                          value={ingredient.calories}
                          onChange={(event) =>
                            handleIngredientChange(index, event)
                          }
                          placeholder=""
                          required
                        />
                      </div>

                      <div className="form-field">
                        <label>Protein</label>
                        <input
                          name="protein"
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.protein}
                          onChange={(event) =>
                            handleIngredientChange(index, event)
                          }
                          placeholder=""
                        />
                      </div>

                      <div className="form-field">
                        <label>Carbs</label>
                        <input
                          name="carbs"
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.carbs}
                          onChange={(event) =>
                            handleIngredientChange(index, event)
                          }
                          placeholder=""
                        />
                      </div>

                      <div className="form-field">
                        <label>Fat</label>
                        <input
                          name="fat"
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.fat}
                          onChange={(event) =>
                            handleIngredientChange(index, event)
                          }
                          placeholder=""
                        />
                      </div>

                      <div className="form-field">
                        <label>Fiber</label>
                        <input
                          name="fiber"
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.fiber}
                          onChange={(event) =>
                            handleIngredientChange(index, event)
                          }
                          placeholder=""
                        />
                      </div>

                      <div className="form-field">
                        <label>Sodium</label>
                        <input
                          name="sodium"
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.sodium}
                          onChange={(event) =>
                            handleIngredientChange(index, event)
                          }
                          placeholder=""
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="meal-total-card">
                <strong>Meal Total</strong>
                <span>
                  {Math.round(mealTotals.calories)} cal · {mealTotals.protein}g
                  protein · {mealTotals.carbs}g carbs · {mealTotals.fat}g fat
                </span>
              </div>

              <label className="checkbox-row">
                <input
                  name="add_to_easy_log"
                  type="checkbox"
                  checked={mealForm.add_to_easy_log}
                  onChange={handleMealChange}
                />
                Add this meal to Easy Log
              </label>

              <button className="primary-action" type="submit">
                Save Meal Log
              </button>
            </form>
          )}
        </section>

        <section className="page-card input-panel">
          <h2>Workout Log</h2>
          <p>
            Add cardio, weighted training, or rest days so your activity history
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
                  placeholder=""
                  required
                />
              </div>
            ) : (
              <div className="rest-day-callout">
                <strong>Rest Day</strong>
                <span>
                  Recovery counts. Add notes about soreness, sleep, steps, or how
                  your body feels today.
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                    placeholder=""
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
                placeholder=""
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
