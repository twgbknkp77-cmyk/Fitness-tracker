// FITNESS TRACKER — PROFILE AND GOALS

const PROFILE_GOALS_KEY = "fitness_profile_goals";

// GET SAVED PROFILE GOALS
function getProfileGoals() {
  try {
    return JSON.parse(
      localStorage.getItem(PROFILE_GOALS_KEY)
    ) || {};
  } catch {
    return {};
  }
}

// SAVE PROFILE GOALS
function saveProfileGoals(goals) {
  localStorage.setItem(
    PROFILE_GOALS_KEY,
    JSON.stringify(goals)
  );
}

// DISPLAY SAVED BODYWEIGHT GOAL
function renderBodyweightGoal() {
  const goals = getProfileGoals();
  const bodyweightGoal = goals.bodyweight;

  const weightInput = document.getElementById("goalBodyweight");
  const dateInput = document.getElementById("goalBodyweightDate");
  const message = document.getElementById("bodyweightGoalMessage");

  if (!weightInput || !dateInput || !message) return;

  if (!bodyweightGoal) {
    message.textContent = "No bodyweight goal saved yet.";
    return;
  }

  weightInput.value = bodyweightGoal.targetWeight;
  dateInput.value = bodyweightGoal.targetDate || "";

  message.textContent =
    `Current goal: ${bodyweightGoal.targetWeight} kg` +
    (bodyweightGoal.targetDate
      ? ` by ${bodyweightGoal.targetDate}`
      : "");
}

// SAVE BODYWEIGHT GOAL BUTTON
document.getElementById("saveBodyweightGoal")
  ?.addEventListener("click", () => {
    const weightInput =
      document.getElementById("goalBodyweight");

    const dateInput =
      document.getElementById("goalBodyweightDate");

    const targetWeight = Number(weightInput.value);
    const targetDate = dateInput.value;

    if (
      !Number.isFinite(targetWeight) ||
      targetWeight < 20 ||
      targetWeight > 300
    ) {
      alert("Please enter a valid target weight.");
      return;
    }

    const goals = getProfileGoals();

    goals.bodyweight = {
      targetWeight,
      targetDate
    };

    saveProfileGoals(goals);
    renderBodyweightGoal();
  });

// INITIAL DISPLAY
renderBodyweightGoal();
