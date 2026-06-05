import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5555";

const emptyProfile = {
  name: "",
  gender: "",
  birth_date: "",
  age: "",
  height: "",
  current_weight: "",
  weight_unit: "lb",
  fitness_goal: "",
  dietary_preferences: "",
  target_calories: "",
  target_protein: "",
  target_carbs: "",
  target_fat: "",
  coaching_style: "",
};

const heightOptions = [];

for (let feet = 3; feet <= 8; feet += 1) {
  for (let inches = 0; inches <= 11; inches += 1) {
    if (feet === 8 && inches > 0) break;

    heightOptions.push(`${feet}'${inches}"`);
  }
}

function calculateAge(birthDate) {
  if (!birthDate) return "";

  const today = new Date();
  const dob = new Date(birthDate);

  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  const dayDifference = today.getDate() - dob.getDate();

  if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
    age -= 1;
  }

  return age;
}

function getMacroCalories(profile) {
  const protein = Number(profile.target_protein) || 0;
  const carbs = Number(profile.target_carbs) || 0;
  const fat = Number(profile.target_fat) || 0;

  return protein * 4 + carbs * 4 + fat * 9;
}

function formatProfileData(data) {
  return {
    name: data.name || "",
    gender: data.gender || "",
    birth_date: data.birth_date || "",
    age: data.age || "",
    height: data.height || "",
    current_weight: data.current_weight || "",
    weight_unit: data.weight_unit || "lb",
    fitness_goal: data.fitness_goal || "",
    dietary_preferences: data.dietary_preferences || "",
    target_calories: data.target_calories || "",
    target_protein: data.target_protein || "",
    target_carbs: data.target_carbs || "",
    target_fat: data.target_fat || "",
    coaching_style: data.coaching_style || "",
  };
}

function Profile({ currentUser, setCurrentUser }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/profile`, {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) return response.json();

        if (response.status === 404) return null;

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to load profile.");
        });
      })
      .then((data) => {
        if (data) {
          setProfile(formatProfileData(data));
          setHasProfile(true);
        }
      })
      .catch((error) => setError(error.message))
      .finally(() => setIsLoading(false));
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "birth_date") {
      setProfile({
        ...profile,
        birth_date: value,
        age: calculateAge(value),
      });

      return;
    }

    setProfile({
      ...profile,
      [name]: value,
    });
  }

  function buildProfilePayload() {
    const macroCalories = getMacroCalories(profile);
    const targetCalories = Number(profile.target_calories) || 0;

    if (targetCalories && macroCalories > targetCalories) {
      throw new Error(
        `Macro targets equal ${macroCalories} calories, which is higher than your ${targetCalories} calorie target.`
      );
    }

    // Age is intentionally removed from the outgoing payload.
    // The backend should calculate saved age from birth_date only.
    const { age, ...profileWithoutAge } = profile;

    return {
      ...profileWithoutAge,
      current_weight: profile.current_weight
        ? Number(profile.current_weight)
        : null,
      target_calories: profile.target_calories
        ? Number(profile.target_calories)
        : null,
      target_protein: profile.target_protein
        ? Number(profile.target_protein)
        : null,
      target_carbs: profile.target_carbs ? Number(profile.target_carbs) : null,
      target_fat: profile.target_fat ? Number(profile.target_fat) : null,
    };
  }

  function handleUsernameSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsSavingUsername(true);

    fetch(`${API_URL}/account`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
      username,
      }),
    })
      .then((response) => {
        if (response.ok) return response.json();

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to update username.");
        });
      })
      .then((user) => {
        setCurrentUser(user);
        setUsername(user.username || "");
        setMessage("Username updated.");
      })
      .catch((error) => setError(error.message))
      .finally(() => setIsSavingUsername(false));
  }

  function handleSubmit(event) {
    event.preventDefault();

    setIsSaving(true);
    setError("");
    setMessage("");

    let payload;

    try {
      payload = buildProfilePayload();
    } catch (error) {
      setError(error.message);
      setIsSaving(false);
      return;
    }

    fetch(`${API_URL}/profile`, {
      method: hasProfile ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (response.ok) return response.json();

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to save profile.");
        });
      })
      .then((data) => {
        setProfile(formatProfileData(data));
        setHasProfile(true);
        setMessage(hasProfile ? "Profile updated." : "Profile created.");
      })
      .catch((error) => setError(error.message))
      .finally(() => setIsSaving(false));
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Profile</h1>
        <p>Loading your profile...</p>
      </section>
    );
  }

  const macroCalories = getMacroCalories(profile);
  const targetCalories = Number(profile.target_calories) || 0;
  const macrosMatch = targetCalories > 0 && macroCalories === targetCalories;
  const showMacroWarning = targetCalories > 0 && macroCalories !== targetCalories;

  return (
    <section className="page-card profile-page">
      <p className="eyebrow">Your fitness baseline</p>
      <h1>Profile</h1>
      <p>
        Set the personal details PumpAI will use to organize your logs and guide
        future coaching feedback.
      </p>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-message">{message}</p> : null}

      <form className="account-form" onSubmit={handleUsernameSubmit}>
        <h2>Account</h2>

        <div className="form-field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        <button className="primary-action" type="submit" disabled={isSavingUsername}>
          {isSavingUsername ? "Saving..." : "Update Username"}
        </button>
      </form>

      <form className="profile-form" onSubmit={handleSubmit}>
        <h2>Fitness Profile</h2>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={profile.name}
              onChange={handleChange}
              placeholder="Name..."
            />
          </div>

          <div className="form-field">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={profile.gender}
              onChange={handleChange}
            >
              <option value="">Select one</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Nonbinary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="birth_date">Date of Birth</label>
            <input
              id="birth_date"
              name="birth_date"
              type="date"
              value={profile.birth_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="age">Age</label>
            <input
              id="age"
              name="age"
              type="number"
              value={profile.age}
              readOnly
              placeholder="Auto-calculated"
            />
          </div>

          <div className="form-field">
            <label htmlFor="height">Height</label>
            <select
              id="height"
              name="height"
              value={profile.height}
              onChange={handleChange}
            >
              <option value="">Select height</option>
              {heightOptions.map((height) => (
                <option key={height} value={height}>
                  {height}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="current_weight">
              Current Weight ({profile.weight_unit})
            </label>
            <div className="weight-input-row">
              <input
                id="current_weight"
                name="current_weight"
                type="number"
                step="0.1"
                value={profile.current_weight}
                onChange={handleChange}
                placeholder="230.2"
              />

              <select
                name="weight_unit"
                value={profile.weight_unit}
                onChange={handleChange}
                aria-label="Weight unit"
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="fitness_goal">Fitness Goal</label>
            <select
              id="fitness_goal"
              name="fitness_goal"
              value={profile.fitness_goal}
              onChange={handleChange}
            >
              <option value="">Select goal</option>
              <option value="Lose fat">Lose fat</option>
              <option value="Build muscle">Build muscle</option>
              <option value="Lose fat and build muscle">
                Lose fat and build muscle
              </option>
              <option value="Maintain weight">Maintain weight</option>
              <option value="Improve performance">Improve performance</option>
              <option value="General health">General health</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="coaching_style">Coaching Style</label>
            <select
              id="coaching_style"
              name="coaching_style"
              value={profile.coaching_style}
              onChange={handleChange}
            >
              <option value="">Select style</option>
              <option value="Direct but encouraging">
                Direct but encouraging
              </option>
              <option value="Strict accountability">
                Strict accountability
              </option>
              <option value="Supportive and gentle">
                Supportive and gentle
              </option>
              <option value="Data-driven and analytical">
                Data-driven and analytical
              </option>
              <option value="High-energy hype coach">
                High-energy hype coach
              </option>
            </select>
          </div>

          <div className="form-field full-width">
            <label htmlFor="dietary_preferences">Dietary Preferences</label>
            <input
              id="dietary_preferences"
              name="dietary_preferences"
              type="text"
              value={profile.dietary_preferences}
              onChange={handleChange}
              placeholder="High protein flexible dieting"
            />
          </div>

          <div className="form-field">
            <label htmlFor="target_calories">Target Calories</label>
            <input
              id="target_calories"
              name="target_calories"
              type="number"
              value={profile.target_calories}
              onChange={handleChange}
              placeholder="2400"
            />
          </div>

          <div className="form-field">
            <label htmlFor="target_protein">Target Protein</label>
            <input
              id="target_protein"
              name="target_protein"
              type="number"
              value={profile.target_protein}
              onChange={handleChange}
              placeholder="200"
            />
          </div>

          <div className="form-field">
            <label htmlFor="target_carbs">Target Carbs</label>
            <input
              id="target_carbs"
              name="target_carbs"
              type="number"
              value={profile.target_carbs}
              onChange={handleChange}
              placeholder="200"
            />
          </div>

          <div className="form-field">
            <label htmlFor="target_fat">Target Fat</label>
            <input
              id="target_fat"
              name="target_fat"
              type="number"
              value={profile.target_fat}
              onChange={handleChange}
              placeholder="70"
            />
          </div>

          <div
            className={`macro-summary full-width ${
              macrosMatch
                ? "macro-summary-success"
                : showMacroWarning
                  ? "macro-summary-warning"
                  : ""
            }`}
          >
            {macrosMatch ? (
              <p>
                <strong>Calorie Goal = {targetCalories}</strong>
                <span className="checkmark">✓</span>
              </p>
            ) : showMacroWarning ? (
              <>
                <p>
                  <strong>*Warning*</strong>
                </p>
                <p>Sum of Macros = {macroCalories} calories</p>
                <p>Calorie Goal = {targetCalories}</p>
              </>
            ) : (
              <p>Enter calorie and macro targets to check alignment.</p>
            )}
          </div>
        </div>

        <button className="primary-action" type="submit" disabled={isSaving}>
          {isSaving
            ? "Saving..."
            : hasProfile
              ? "Update Profile"
              : "Create Profile"}
        </button>
      </form>
    </section>
  );
}

export default Profile;