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

// DISPLAY SAVED EXERCISE GOALS
function renderExerciseGoals() {
  const container =
    document.getElementById("exerciseGoalsList");

  if (!container) return;

  const goals = getProfileGoals();
  const exerciseGoals = goals.exerciseGoals || [];

  container.innerHTML = "";

  if (exerciseGoals.length === 0) {
    container.innerHTML =
      "<p>No exercise goals saved yet.</p>";
    return;
  }

  exerciseGoals.forEach(goal => {
    const card = document.createElement("div");
    card.className = "card";

    const heading = document.createElement("h3");
    heading.textContent = goal.exerciseName;

    const target = document.createElement("p");
    target.textContent =
      `${goal.targetWeight} kg × ${goal.targetReps} reps`;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove Goal";

    removeButton.addEventListener("click", () => {
      const updatedGoals = getProfileGoals();

      updatedGoals.exerciseGoals =
        (updatedGoals.exerciseGoals || []).filter(
          item => item.id !== goal.id
        );

      saveProfileGoals(updatedGoals);
      renderExerciseGoals();
    });

    card.append(
      heading,
      target,
      removeButton
    );

    container.appendChild(card);
  });
}

// ADD EXERCISE GOAL
document.getElementById("addExerciseGoal")
  ?.addEventListener("click", () => {
    const nameInput =
      document.getElementById("exerciseGoalName");

    const weightInput =
      document.getElementById("exerciseGoalWeight");

    const repsInput =
      document.getElementById("exerciseGoalReps");

    const exerciseName = nameInput.value.trim();
    const targetWeight = Number(weightInput.value);
    const targetReps = Number(repsInput.value);

    if (!exerciseName) {
      alert("Please enter an exercise name.");
      return;
    }

    if (
      !Number.isFinite(targetWeight) ||
      targetWeight < 0
    ) {
      alert("Please enter a valid target weight.");
      return;
    }

    if (
      !Number.isInteger(targetReps) ||
      targetReps < 1
    ) {
      alert("Please enter a valid number of repetitions.");
      return;
    }

    const goals = getProfileGoals();

    if (!Array.isArray(goals.exerciseGoals)) {
      goals.exerciseGoals = [];
    }

    goals.exerciseGoals.push({
      id: createId(),
      exerciseName,
      targetWeight,
      targetReps
    });

    saveProfileGoals(goals);

    nameInput.value = "";
    weightInput.value = "";
    repsInput.value = "";

    renderExerciseGoals();
  });

// INITIAL DISPLAY
renderBodyweightGoal();
renderExerciseGoals();
