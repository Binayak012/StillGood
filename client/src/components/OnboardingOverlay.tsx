import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const steps = [
  {
    emoji: "🥦",
    eyebrow: "What StillGood does",
    title: "Track freshness, stop waste.",
    body: "Add groceries once and StillGood keeps track of what's fresh, what's getting risky, and what needs attention next."
  },
  {
    emoji: "⏰",
    eyebrow: "Why it helps",
    title: "Get warned before food goes bad.",
    body: "Opened items tighten their freshness window. Use-soon items rise to the top so you always know what to eat first."
  },
  {
    emoji: "🏠",
    eyebrow: "What to do next",
    title: "Set up your household and add items.",
    body: "Create a household, add what's in your fridge, then use recipes, alerts, and analytics to stay ahead of waste."
  }
] as const;

const seenKey = (userId: string) => `stillgood_onboarded_${userId}`;

interface OnboardingOverlayProps {
  userId: string;
  householdName: string | null;
}

export function OnboardingOverlay({ userId }: OnboardingOverlayProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(seenKey(userId))) {
      setStepIndex(0);
      setOpen(true);
    }
  }, [userId]);

  const dismiss = () => {
    localStorage.setItem(seenKey(userId), "1");
    setOpen(false);
  };

  if (!open) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <section className="onboarding-shell">
        <button className="onboarding-skip" type="button" onClick={dismiss} aria-label="Skip onboarding">
          Skip
        </button>

        <div className="onboarding-body">
          <div className="onboarding-emoji" aria-hidden="true">{step.emoji}</div>
          <span className="onboarding-eyebrow">{step.eyebrow}</span>
          <h2 id="onboarding-title">{step.title}</h2>
          <p>{step.body}</p>
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots" aria-label="Onboarding progress">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`onboarding-dot${i === stepIndex ? " active" : ""}`}
                onClick={() => setStepIndex(i)}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {isLast ? (
            <div className="onboarding-final-actions">
              <Link className="button secondary" to="/add-item" onClick={dismiss}>
                Add first item
              </Link>
              <button type="button" className="button" onClick={dismiss}>
                Open dashboard
              </button>
            </div>
          ) : (
            <button type="button" className="button" onClick={() => setStepIndex((i) => i + 1)}>
              Next
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
