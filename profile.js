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
  // Exercise goals now use a freely typed name.
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

  const stats=document.getElementById("bodyweightGoalStats");
  const currentOutput=document.getElementById("bodyweightGoalCurrent");
  const targetOutput=document.getElementById("bodyweightGoalTarget");
  const remainingOutput=document.getElementById("bodyweightGoalRemaining");
  const progressOutput=document.getElementById("bodyweightGoalProgress");

  if (
    !weightInput ||
    !dateInput ||
    !message
  ) {
    return;
  }

  if (!bodyweightGoal) {
    message.textContent = "Set Goal";
    if(stats)stats.hidden=true;
    weightInput.value="";
    dateInput.value="";

    return;
  }

  weightInput.value =
    bodyweightGoal.targetWeight;

  dateInput.value =
    bodyweightGoal.targetDate || "";

  const weights=FitnessStorage.getWeights().filter(entry=>entry&&Number.isFinite(Number(entry.weight))).sort((a,b)=>new Date(a.recordedAt||`${a.date}T12:00:00`)-new Date(b.recordedAt||`${b.date}T12:00:00`));
  const current=weights.length?Number(weights[weights.length-1].weight):null;
  const target=Number(bodyweightGoal.targetWeight);
  const start=Number(bodyweightGoal.startingWeight);
  const remaining=current===null?null:Math.abs(target-current);
  const total=Number.isFinite(start)?target-start:0;
  const travelled=current===null||!Number.isFinite(start)?0:current-start;
  const progress=total!==0?Math.min(100,Math.max(0,(travelled/total)*100)):0;
  message.textContent = bodyweightGoal.targetDate ? `Target ${target} kg · ${bodyweightGoal.targetDate}` : `Target ${target} kg`;
  if(stats)stats.hidden=false;
  if(currentOutput)currentOutput.textContent=current===null?"--":`${current.toFixed(1)} kg`;
  if(targetOutput)targetOutput.textContent=`${target.toFixed(1)} kg`;
  if(remainingOutput)remainingOutput.textContent=remaining===null?"--":`${remaining.toFixed(1)} kg`;
  if(progressOutput)progressOutput.style.width=`${progress}%`;
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
    document.getElementById("bodyweightGoalEditor")?.removeAttribute("open");

    if (
      typeof updateDashboard ===
      "function"
    ) {
      updateDashboard();
    }
  });


// CLOSE BODYWEIGHT EDITOR WITHOUT SAVING
document
  .getElementById("cancelBodyweightGoal")
  ?.addEventListener("click", () => {
    renderBodyweightGoal();
    document.getElementById("bodyweightGoalEditor")?.removeAttribute("open");
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
function renderExerciseGoalsLegacy() {
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


// COMPACT EXERCISE GOAL CARDS
function renderExerciseGoals() {
  const container = document.getElementById("exerciseGoalsList");
  if (!container) return;

  const goals = getProfileGoals();
  const exerciseGoals = Array.isArray(goals.exerciseGoals)
    ? goals.exerciseGoals
    : [];

  container.innerHTML = "";

  if (exerciseGoals.length === 0) {
    container.innerHTML = "<div class='card empty-state-card'><p>No exercise goals saved yet.</p></div>";
    return;
  }

  exerciseGoals.forEach(goal => {
    const bestWeight = getBestExerciseWeight(goal.exerciseName);
    const percentage = goal.targetWeight > 0
      ? Math.min(100, Math.round((bestWeight / goal.targetWeight) * 100))
      : 0;

    const card = document.createElement("div");
    card.className = "card goal-card";
    const header = document.createElement("div");
    header.className = "compact-card-header";
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = goal.exerciseName;
    const current = document.createElement("p");
    current.textContent = bestWeight > 0
      ? `Current: ${bestWeight} kg • Target: ${goal.targetWeight} kg`
      : `No result yet • Target: ${goal.targetWeight} kg`;
    copy.append(heading, current);

    const menu = document.createElement("details");
    menu.className = "overflow-menu";
    const summary = document.createElement("summary");
    summary.textContent = "⋯";
    summary.setAttribute("aria-label", `${goal.exerciseName} goal options`);
    const panel = document.createElement("div");
    panel.className = "overflow-menu-panel";

    const edit = document.createElement("button");
    edit.textContent = "Edit goal";
    edit.addEventListener("click", () => {
      const value = prompt("Target weight (kg):", goal.targetWeight);
      if (value === null) return;
      const targetWeight = Number(value);
      if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
        alert("Please enter a valid target weight.");
        return;
      }
      const updated = getProfileGoals();
      const saved = (updated.exerciseGoals || []).find(item => item.id === goal.id);
      if (!saved) return;
      saved.targetWeight = targetWeight;
      delete saved.targetReps;
      saveProfileGoals(updated);
      renderExerciseGoals();
      if (typeof updateDashboard === "function") updateDashboard();
    });

    const remove = document.createElement("button");
    remove.textContent = "Remove goal";
    remove.className = "danger-action";
    remove.addEventListener("click", async () => {
      if (!await showSpotConfirm(
        `Remove ${goal.exerciseName}?`,
        "This exercise goal will be removed from your profile and dashboard.",
        { confirmText: "Remove Goal", danger: true }
      )) return;
      const updated = getProfileGoals();
      updated.exerciseGoals = (updated.exerciseGoals || [])
        .filter(item => item.id !== goal.id);
      saveProfileGoals(updated);
      renderExerciseGoals();
      if (typeof updateDashboard === "function") updateDashboard();
    });

    panel.append(edit, remove);
    menu.append(summary, panel);
    header.append(copy, menu);

    const progress = document.createElement("div");
    progress.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${percentage}%`;
    progress.appendChild(fill);

    const label = document.createElement("p");
    label.textContent = `${percentage}% complete`;
    card.append(header, progress, label);
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
    document.getElementById("exerciseGoalEditor")?.removeAttribute("open");

    if (
      typeof updateDashboard ===
      "function"
    ) {
      updateDashboard();
    }
  });


// CLOSE EXERCISE GOAL EDITOR WITHOUT SAVING
document
  .getElementById("cancelExerciseGoal")
  ?.addEventListener("click", () => {
    const nameInput = document.getElementById("exerciseGoalName");
    const weightInput = document.getElementById("exerciseGoalWeight");
    if (nameInput) nameInput.value = "";
    if (weightInput) weightInput.value = "";
    document.getElementById("exerciseGoalEditor")?.removeAttribute("open");
  });


// INITIAL DISPLAY
populateExerciseSuggestions();
renderBodyweightGoal();
renderExerciseGoals();
