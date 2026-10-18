// FITNESS TRACKER — WORKOUT HISTORY

function renderWorkoutHistory() {
  const container = document.getElementById("workoutHistoryList");
  if (!container) return;

  const history = JSON.parse(
    localStorage.getItem("fitness_workout_history") || "[]"
  );

  container.innerHTML = "";

  if (history.length === 0) {
    container.innerHTML = "<p>No completed workouts yet.</p>";
    return;
  }

  // Newest workouts first
  history.sort((a, b) =>
    new Date(b.finishedAt) - new Date(a.finishedAt)
  );

  history.forEach(session => {
    const card = document.createElement("div");
    card.className = "card";

    const date = new Date(session.finishedAt)
      .toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

    const completedSets = session.exercises
      .flatMap(exercise => exercise.sets)
      .filter(set => set.completed).length;

    const title = document.createElement("h3");
    title.textContent = session.workoutName;

    const details = document.createElement("p");
    details.textContent =
      `${date} • ${session.programmeName} • ${completedSets} sets completed`;

    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = "View Results →";

        button.addEventListener("click", () => {
      viewWorkoutHistoryDetails(session);
    });

    const restoreButton = document.createElement("button");
    restoreButton.textContent = "Restore to Workouts";

    restoreButton.addEventListener("click", () => {
      restoreCompletedWorkout(session);
    });

    card.append(
      title,
      details,
      button,
      restoreButton
    );
    container.appendChild(card);
  });
}
function restoreCompletedWorkout(session) {
  if (
    !confirm(
      `Restore "${session.workoutName}" to your workouts?`
    )
  ) {
    return;
  }

  const history = JSON.parse(
    localStorage.getItem("fitness_workout_history") || "[]"
  );

  const updatedHistory = history.filter(
    item => item.id !== session.id
  );

  localStorage.setItem(
    "fitness_workout_history",
    JSON.stringify(updatedHistory)
  );

  renderWorkoutHistory();
  renderActiveWorkout();

  alert("Workout restored.");
}
function viewWorkoutHistoryDetails(session) {
  const container = document.getElementById("workoutHistoryList");
  container.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = session.workoutName;

  container.appendChild(heading);

  session.exercises.forEach(exercise => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = exercise.name;

    card.appendChild(title);

    exercise.sets.forEach((set, index) => {
      const row = document.createElement("p");

      row.textContent =
        `Set ${index + 1}: ${set.weight} kg × ${set.reps} reps` +
        (set.completed ? " ✓" : " — Not completed");

      card.appendChild(row);
    });

    container.appendChild(card);
  });

  const backButton = document.createElement("button");
  backButton.textContent = "← Back to History";

  backButton.addEventListener("click", renderWorkoutHistory);

  container.appendChild(backButton);
}
