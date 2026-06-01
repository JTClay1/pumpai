import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5555";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

const requestOptions = [
  {
    value: "daily_review",
    label: "Daily Review",
    description: "Review today’s food, workouts, and recovery signals.",
  },
  {
    value: "weekly_review",
    label: "Weekly Review",
    description: "Look for trends across recent logs and habits.",
  },
  {
    value: "nutrition_question",
    label: "Nutrition Question",
    description: "Ask about calories, macros, protein, hunger, or meal choices.",
  },
  {
    value: "training_question",
    label: "Training Question",
    description: "Ask about workouts, rest days, soreness, or progression.",
  },
  {
    value: "custom_question",
    label: "Custom Question",
    description: "Ask PumpAI anything specific about your fitness data.",
  },
];

function formatRequestType(requestType) {
  return requestType
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function CoachCorner() {
  const [coachResponses, setCoachResponses] = useState([]);
  const [requestType, setRequestType] = useState("daily_review");
  const [question, setQuestion] = useState("");
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCoachResponses();
  }, []);

  function loadCoachResponses() {
    setIsLoading(true);

    fetch(`${API_URL}/coach_responses?page=1&per_page=20`, {
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) return response.json();

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to load coach responses.");
        });
      })
      .then((data) => setCoachResponses(data.coach_responses || []))
      .catch((error) => setError(error.message))
      .finally(() => setIsLoading(false));
  }

  function buildSavedResponseText() {
    if (question.trim() && responseText.trim()) {
      return `Question: ${question.trim()}\n\nResponse: ${responseText.trim()}`;
    }

    if (question.trim()) {
      return `Question: ${question.trim()}\n\nResponse: AI response will be generated here in a future update.`;
    }

    return responseText.trim();
  }

  function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!question.trim()) {
      setError("Ask a question before generating a coach response.");
      return;
    }

    setIsSaving(true);

    fetch(`${API_URL}/coach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        request_type: requestType,
        question: question.trim(),
      }),
    })
      .then((response) => {
        if (response.ok) return response.json();

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to generate coach response.");
        });
      })
      .then(() => {
        setQuestion("");
        setResponseText("");
        setMessage("Coach response generated and saved.");
        loadCoachResponses();
      })
      .catch((error) => setError(error.message))
      .finally(() => setIsSaving(false));
  }

  function handleDelete(id) {
    setError("");
    setMessage("");

    fetch(`${API_URL}/coach_responses/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) return null;

        return response.json().then((data) => {
          throw new Error(data.error || "Unable to delete coach response.");
        });
      })
      .then(() => {
        setMessage("Coach response deleted.");
        loadCoachResponses();
      })
      .catch((error) => setError(error.message));
  }

  const selectedOption = requestOptions.find(
    (option) => option.value === requestType
  );

  return (
    <section className="coach-page">
      <div className="page-card coach-hero">
        <p className="eyebrow">Guided feedback</p>
        <h1>Coach’s Corner</h1>
        <p>
          Ask specific questions, save coaching notes, and build the feedback
          history that will later power PumpAI’s AI training agent.
        </p>

        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-message">{message}</p> : null}
      </div>

      <div className="coach-grid">
        <section className="page-card coach-input-panel">
          <h2>Ask PumpAI</h2>
          <p>
            Choose the kind of feedback you want, then write a specific question.
            The AI route will plug into this flow next.
          </p>

          <div className="coach-option-grid">
            {requestOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  requestType === option.value
                    ? "coach-option-card active"
                    : "coach-option-card"
                }
                onClick={() => setRequestType(option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>

          <form className="stacked-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="question">Question</label>
              <textarea
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows="5"
              />
            </div>

            <div className="coach-preview-card">
              <strong>AI Response</strong>
              <span>Generated responses will be saved automatically.</span>
              <p>
                After you ask a question, PumpAI will retrieve your profile, food logs,
                workout logs, and previous coach responses before generating feedback.
              </p>
            </div>

            <div className="coach-preview-card">
              <strong>Selected Mode</strong>
              <span>{selectedOption?.label}</span>
              <p>{selectedOption?.description}</p>
            </div>

            <button className="primary-action" type="submit" disabled={isSaving}>
              {isSaving ? "Generating..." : "Generate Coach Response"}
            </button>
          </form>
        </section>

        <section className="page-card coach-saved-panel">
          <h2>Saved Responses</h2>

          {isLoading ? (
            <p>Loading saved coach responses...</p>
          ) : coachResponses.length > 0 ? (
            <ul className="coach-response-list">
              {coachResponses.map((response) => (
                <li key={response.id}>
                  <div>
                    <strong>{formatRequestType(response.request_type)}</strong>
                    <span>{response.created_at}</span>
                  </div>

                  <p>{response.response_text}</p>

                  <button
                    className="danger-button saved-response-delete"
                    type="button"
                    onClick={() => handleDelete(response.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No coach responses saved yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

export default CoachCorner;