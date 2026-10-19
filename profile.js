// FITNESS TRACKER â€” PROFILE AND GOALS

const PROFILE_GOALS_KEY =
  "fitness_profile_goals";


// GET SAVED PROFILE GOALS
function getProfileGoals() {
  try {
    return JSON.parse(
      localStorage.getItem(
        PROFILE_GOALS_KEY
      )
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


// NORMALISE AN EXERCISE NAME
function normaliseExerciseName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}


// GET EXERCISE NAMES FROM ALL SAVED PROGRAMMES
function getProgrammeExerciseNames() {
  const names = new Map();

  getProgrammes().forEach(programme => {
    (programme.weeks || []).forEach(week => {
      (week.trainingDays || []).forEach(workout => {
        (workout.exercises || []).forEach(exercise => {
          const name = String(exercise.name || "").trim();
          const key = normaliseExerciseName(name);

          if (key && !names.has(key)) {
            names.set(key, name);
          }
        });
      });
    });
  });

  return [...names.values()].sort((a, b) =>
    a.localeCompare(b)
  );
}


// FILL THE EXERCISE SUGGESTION LIST
function populateExerciseSuggestions() {
  const list =
    document.getElementById("exerciseGoalName");

  if (!list) return;

  const selectedValue = list.value;
  list.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose an exercise";
  list.appendChild(placeholder);

  getProgrammeExerciseNames().forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    list.appendChild(option);
  });

  if (
    [...list.options].some(
      option => option.value === selectedValue
    )
  ) {
    list.value = selectedValue;
  }
}


// USE THE SAVED SPELLING OF AN EXERCISE WHEN POSSIBLE
function getCanonicalExerciseName(name) {
  const requested = normaliseExerciseName(name);

  return getProgrammeExerciseNames().find(
    exerciseName =>
      normaliseExerciseName(exerciseName) === requested
  ) || name.trim();
}


// FIND THE BEST COMPLETED WEIGHT
function getBestExerciseWeight(exerciseName) {
  let history = [];

  try {
    history = JSON.parse(
      localStorage.getItem(
        "fitness_workout_history"
      ) || "[]"
    );
  } catch {
    history = [];
  }

  const requestedName =
    normaliseExerciseName(exerciseName);

  let bestWeight = 0;

  history.forEach(session => {
    const exercises =
      Array.isArray(session.exercises)
        ? session.exercises
        : [];

    exercises.forEach(exercise => {
      const sameExercise =
        normaliseExerciseName(exercise.name) ===
        requestedName;

      if (!sameExercise) return;

      const sets =
        Array.isArray(exercise.sets)
          ? exercise.sets
          : [];

      sets.forEach(set => {
        const weight = Number(set.weight);

        if (
          set.completed &&
          Number.isFinite(weight) &&
          weight > bestWeight
        ) {
          bestWeight = weight;
        }
      });
    });
  });

  return bestWeight;
}


// DISPLAY SAVED BODYWEIGHT GOAL
function renderBodyweightGoal() {
  const goals = getProfileGoals();

  const bodyweightGoal =
    goals.bodyweight;

  const weightInput =
    document.getElementById(
      "goalBodyweight"
    );

  const dateInput =
    document.getElementById(
      "goalBodyweightDate"
    );

  const message =
    document.getElementById(
      "bodyweightGoalMessage"
    );

  if (
    !weightInput ||
    !dateInput ||
    !message
  ) {
    return;
  }

  if (!bodyweightGoal) {
    message.textContent =
      "No bodyweight goal saved yet.";

    return;
  }

  weightInput.value =
    bodyweightGoal.targetWeight;

  dateInput.value =
    bodyweightGoal.targetDate || "";

  message.textContent =
    `Current goal: ` +
    `${bodyweightGoal.targetWeight} kg` +
    (
      bodyweightGoal.targetDate
        ? ` by ${bodyweightGoal.targetDate}`
        : ""
    );
}


// SAVE BODYWEIGHT GOAL
document
  .getElementById("saveBodyweightGoal")
  ?.addEventListener("click", () => {
    const weightInput =
      document.getElementById(
        "goalBodyweight"
      );

    const dateInput =
      document.getElementById(
        "goalBodyweightDate"
      );

    const targetWeight =
      Number(weightInput.value);

    const targetDate =
      dateInput.value;

    if (
      !Number.isFinite(targetWeight) ||
      targetWeight < 20 ||
      targetWeight > 300
    ) {
      alert(
        "Please enter a valid target weight."
      );

      return;
    }

    const goals = getProfileGoals();

    /*
     * Preserve an existing starting weight.
     * If this is a new goal, use the latest
     * recorded bodyweight as its starting point.
     */
    let startingWeight =
      goals.bodyweight?.startingWeight;

    if (!Number.isFinite(startingWeight)) {
      const weights =
        FitnessStorage.getWeights()
          .filter(entry =>
            entry &&
            Number.isFinite(entry.weight)
          )
          .sort((a, b) => {
            const aTime =
              a.recordedAt
                ? new Date(
                    a.recordedAt
                  ).getTime()
                : new Date(
                    `${a.date}T12:00:00`
                  ).getTime();

            const bTime =
              b.recordedAt
                ? new Date(
                    b.recordedAt
                  ).getTime()
                : new Date(
                    `${b.date}T12:00:00`
                  ).getTime();

            return aTime - bTime;
          });

      startingWeight =
        weights.length > 0
          ? weights[
              weights.length - 1
            ].weight
          : null;
    }

    goals.bodyweight = {
      targetWeight,
      targetDate,
      startingWeight
    };

    saveProfileGoals(goals);
    renderBodyweightGoal();

    if (
      typeof updateDashboard ===
      "function"
    ) {
      updateDashboard();
    }
  });


// RESET BODYWEIGHT GOAL STARTING POINT
document
  .getElementById("resetBodyweightGoalStart")
  ?.addEventListener("click", () => {
    const goals = getProfileGoals();

    if (!goals.bodyweight) {
      alert("Save a bodyweight goal first.");
      return;
    }

    const weights = FitnessStorage.getWeights()
      .filter(entry => entry && Number.isFinite(entry.weight))
      .sort((a, b) => {
        const aTime = a.recordedAt
          ? new Date(a.recordedAt).getTime()
          : new Date(`${a.date}T12:00:00`).getTime();

        const bTime = b.recordedAt
          ? new Date(b.recordedAt).getTime()
          : new Date(`${b.date}T12:00:00`).getTime();

        return aTime - bTime;
      });

    if (weights.length === 0) {
      alert("Add a bodyweight measurement first.");
      return;
    }

    if (!confirm("Use your latest weight as the new starting point?")) {
      return;
    }

    goals.bodyweight.startingWeight =
      weights[weights.length - 1].weight;

    saveProfileGoals(goals);
    renderBodyweightGoal();

    if (typeof updateDashboard === "function") {
      updateDashboard();
    }
  });


// DISPLAY SAVED EXERCISE GOALS
function renderExerciseGoals() {
  const container =
    document.getElementById(
      "exerciseGoalsList"
    );

  if (!container) return;

  const goals = getProfileGoals();

  const exerciseGoals =
    Array.isArray(goals.exerciseGoals)
      ? goals.exerciseGoals
      : [];

  container.innerHTML = "";

  if (exerciseGoals.length === 0) {
    container.innerHTML =
      "<p>No exercise goals saved yet.</p>";

    return;
  }

  exerciseGoals.forEach(goal => {
    const card =
      document.createElement("div");

    card.className = "card";

    const heading =
      document.createElement("h3");

    heading.textContent =
      goal.exerciseName;

    const target =
      document.createElement("p");

    target.textContent =
      `Target: ${goal.targetWeight} kg`;

    const bestWeight =
      getBestExerciseWeight(
        goal.exerciseName
      );

    const current =
      document.createElement("p");

    current.textContent =
      bestWeight > 0
        ? `Current best: ${bestWeight} kg`
        : "Current best: No completed sets yet";

    const percentage =
      goal.targetWeight > 0
        ? Math.min(
            100,
            Math.round(
              (
                bestWeight /
                goal.targetWeight
              ) * 100
            )
          )
        : 0;

    const progress =
      document.createElement("p");

    progress.textContent =
      `Progress: ${percentage}%`;

    const removeButton =
      document.createElement("button");

    removeButton.textContent =
      "Remove Goal";

    removeButton.addEventListener(
      "click",
      () => {
        if (
          !confirm(
            `Remove the ${goal.exerciseName} goal?`
          )
        ) {
          return;
        }

        const updatedGoals =
          getProfileGoals();

        updatedGoals.exerciseGoals =
          (
            updatedGoals.exerciseGoals ||
            []
          ).filter(
            item => item.id !== goal.id
          );

        saveProfileGoals(updatedGoals);
        renderExerciseGoals();

        if (
          typeof updateDashboard ===
          "function"
        ) {
          updateDashboard();
        }
      }
    );

    const editButton =
      document.createElement("button");

    editButton.textContent = "Edit Goal";

    editButton.addEventListener("click", () => {
      const weight = prompt(
        "Target weight (kg):",
        goal.targetWeight
      );

      if (weight === null) return;

      const targetWeight = Number(weight);

      if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
        alert("Please enter a valid target weight.");
        return;
      }

      const updatedGoals = getProfileGoals();
      const savedGoal = (updatedGoals.exerciseGoals || []).find(
        item => item.id === goal.id
      );

      if (!savedGoal) return;

      savedGoal.targetWeight = targetWeight;

      // Old repetition values are no longer used.
      delete savedGoal.targetReps;

      saveProfileGoals(updatedGoals);
      renderExerciseGoals();

      if (typeof updateDashboard === "function") {
        updateDashboard();
      }
    });

    card.append(
      heading,
      target,
      current,
      progress,
      editButton,
      removeButton
    );

    container.appendChild(card);
  });
}


// ADD EXERCISE GOAL
document
  .getElementById("addExerciseGoal")
  ?.addEventListener("click", () => {
    const nameInput =
      document.getElementById(
        "exerciseGoalName"
      );

    const weightInput =
      document.getElementById(
        "exerciseGoalWeight"
      );

    const exerciseName =
      getCanonicalExerciseName(
        nameInput.value
      );

    const targetWeight =
      Number(weightInput.value);

    if (!exerciseName) {
      alert(
        "Please enter an exercise name."
      );

      return;
    }

    if (
      !Number.isFinite(targetWeight) ||
      targetWeight <= 0
    ) {
      alert(
        "Please enter a valid target weight."
      );

      return;
    }

    const goals = getProfileGoals();

    if (
      !Array.isArray(
        goals.exerciseGoals
      )
    ) {
      goals.exerciseGoals = [];
    }

    goals.exerciseGoals.push({
      id: createId(),
      exerciseName,
      targetWeight
    });

    saveProfileGoals(goals);

    nameInput.value = "";
    weightInput.value = "";

    renderExerciseGoals();

    if (
      typeof updateDashboard ===
      "function"
    ) {
      updateDashboard();
    }
  });


// INITIAL DISPLAY
populateExerciseSuggestions();
renderBodyweightGoal();
renderExerciseGoals();
