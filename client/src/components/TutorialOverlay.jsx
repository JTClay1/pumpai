import { useState } from "react";
import Logo from "./Logo";

// Ordered steps for the guided first-run walkthrough.
const tutorialSteps = [
  {
    title: "Build your profile",
    description:
      "Start by setting your fitness baseline: height, weight, goals, macro targets, and coaching style.",
    target: "Profile",
  },
  {
    title: "Log your day",
    description:
      "Use Daily Input to track meals, workouts, rest days, and multi-ingredient meals.",
    target: "Daily Input",
  },
  {
    title: "Save repeat foods",
    description:
      "Add frequent meals and ingredients to Easy Log so your regular items are ready in one click.",
    target: "Easy Log",
  },
  {
    title: "Review your history",
    description:
      "History groups food logs, workouts, rest days, and coach responses by date so your progress is easy to review.",
    target: "History",
  },
  {
    title: "Ask Coach’s Corner",
    description:
      "Ask specific questions and PumpAI will use your saved profile and logs to generate useful coaching feedback.",
    target: "Coach’s Corner",
  },
];

function TutorialOverlay({ isOpen, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);

  if (!isOpen) return null;

  const step = tutorialSteps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === tutorialSteps.length - 1;

  function handleBack() {
    if (!isFirstStep) {
      setStepIndex(stepIndex - 1);
    }
  }

  function handleNext() {
    if (isLastStep) {
      // Finishing resets the tour so it starts at the beginning next time.
      setStepIndex(0);
      onClose();
      return;
    }

    setStepIndex(stepIndex + 1);
  }

  function handleSkip() {
    setStepIndex(0);
    onClose();
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      <div className="tutorial-card">
        <button className="tutorial-close" type="button" onClick={handleSkip}>
          ×
        </button>

        <Logo className="site-logo tutorial-logo" />

        <p className="eyebrow">Quick tour</p>
        <h2>{step.title}</h2>

        <div className="tutorial-target-pill">{step.target}</div>

        <p>{step.description}</p>

        <div className="tutorial-progress">
          {tutorialSteps.map((tutorialStep, index) => (
            <span
              key={tutorialStep.title}
              className={index === stepIndex ? "active" : ""}
            />
          ))}
        </div>

        <div className="tutorial-actions">
          <button type="button" onClick={handleBack} disabled={isFirstStep}>
            Back
          </button>

          <button type="button" onClick={handleNext}>
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>

        <button className="tutorial-skip" type="button" onClick={handleSkip}>
          Skip tour
        </button>
      </div>
    </div>
  );
}

export default TutorialOverlay;
