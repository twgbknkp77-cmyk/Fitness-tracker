// FITNESS TRACKER — WORKOUT HISTORY

function getSavedWorkoutHistory() {
  try {
    const history = JSON.parse(
      localStorage.getItem("fitness_workout_history") || "[]"
    );

    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}


function renderWorkoutHistory() {
  const container =
    document.getElementById("workoutHistoryList");

  if (!container) return;

  const history = getSavedWorkoutHistory();

  container.innerHTML = "";

  if (history.length === 0) {
    container.innerHTML = "<p>No completed workouts yet.</p>";
    return;
  }

  history
    .sort(
      (a, b) =>
        new Date(b.finishedAt) -
        new Date(a.finishedAt)
    )
    .forEach(session => {
      const card = document.createElement("div");
      card.className = "card";

      const date = new Date(session.finishedAt)
        .toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

      const completedSets = (
        Array.isArray(session.exercises)
          ? session.exercises
          : []
      )
        .flatMap(exercise =>
          Array.isArray(exercise.sets)
            ? exercise.sets
            : []
        )
        .filter(set => set.completed)
        .length;

      const title = document.createElement("h3");
      title.textContent = session.workoutName;

      const details = document.createElement("p");
      details.textContent =
        `${date} • ${session.programmeName}` +
        (session.weekNumber
          ? ` • Week ${session.weekNumber}`
          : "") +
        ` • ${completedSets} sets completed`;

      const button = document.createElement("button");
      button.className = "primary-button";
      button.textContent = "View Results →";

      button.addEventListener("click", () => {
        viewWorkoutHistoryDetails(session);
      });

      card.append(title, details, button);
      container.appendChild(card);
    });
}


function viewWorkoutHistoryDetails(session) {
  const container =
    document.getElementById("workoutHistoryList");

  if (!container) return;

  container.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = session.workoutName;

  const sessionDetails = document.createElement("p");
  sessionDetails.textContent =
    `${session.programmeName}` +
    (session.weekNumber
      ? ` • Week ${session.weekNumber}`
      : "");

  container.append(heading, sessionDetails);

  (session.exercises || []).forEach(exercise => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = exercise.name;

    card.appendChild(title);

    (exercise.sets || []).forEach((set, index) => {
      const row = document.createElement("p");
      const plannedWeight = Number(set.plannedWeight);
      const plannedReps = Number(set.plannedReps);

      let text =
        `Set ${index + 1}: ` +
        `${Number(set.weight) || 0} kg × ` +
        `${Number(set.reps) || 0} reps`;

      if (
        Number.isFinite(plannedWeight) &&
        Number.isFinite(plannedReps)
      ) {
        text +=
          ` (planned ${plannedWeight} kg × ` +
          `${plannedReps} reps)`;
      }

      row.textContent =
        text +
        (set.completed ? " ✓" : " — Not completed");

      card.appendChild(row);
    });

    container.appendChild(card);
  });

  const backButton = document.createElement("button");
  backButton.textContent = "← Back to History";

  backButton.addEventListener(
    "click",
    renderWorkoutHistory
  );

  container.appendChild(backButton);
}
