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

  const pageBack = document.getElementById("workoutHistoryBack");
  if (pageBack) {
    pageBack.setAttribute("aria-label", "Back to Workouts");
    pageBack.onclick = () => showPage("workouts");
  }

  const history = getSavedWorkoutHistory();
  const intro = document.getElementById("workoutHistoryIntro");

  if (intro) {
    intro.hidden = history.length > 0;
  }

  container.innerHTML = "";

  if (history.length === 0) {
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
      card.className = "card history-session-card";

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
      const completedCardio = (session.exercises || []).filter(
        exercise => exercise.type === "cardio" && Number(exercise.durationMinutes) > 0
      ).length;

      const title = document.createElement("h3");
      title.textContent = session.workoutName;

      const details = document.createElement("p");
      details.textContent =
        `${date} • ${session.programmeName}` +
        (session.weekNumber
          ? ` • Week ${session.weekNumber}`
          : "") +
        ` • ${completedSets + completedCardio} results recorded`;

      const button = document.createElement("button");
      button.className = "history-view-button";
      button.textContent = "View";

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

  const intro = document.getElementById("workoutHistoryIntro");
  if (intro) intro.hidden = true;

  const pageBack = document.getElementById("workoutHistoryBack");
  if (pageBack) {
    pageBack.setAttribute("aria-label", "Back to workout history");
    pageBack.onclick = renderWorkoutHistory;
  }

  const summary = document.createElement("div");
  summary.className = "card history-detail-summary";

  const heading = document.createElement("h2");
  heading.textContent = session.workoutName;

  const sessionDetails = document.createElement("p");
  sessionDetails.textContent =
    `${session.programmeName}` +
    (session.weekNumber
      ? ` • Week ${session.weekNumber}`
      : "");

  summary.append(heading, sessionDetails);
  container.appendChild(summary);

  (session.exercises || []).forEach(exercise => {
    const card = document.createElement("div");
    card.className = "card history-exercise-card";

    const title = document.createElement("h3");
    title.textContent = exercise.name;

    card.appendChild(title);

    if (exercise.note) {
      const note = document.createElement("p");
      note.className = "exercise-note";
      note.textContent = exercise.note;
      card.appendChild(note);
    }

    if (exercise.sessionNote) {
      const sessionNote = document.createElement("p");
      sessionNote.className = "previous-session-note";
      sessionNote.textContent = `Session note: ${exercise.sessionNote}`;
      card.appendChild(sessionNote);
    }

    if (exercise.type === "cardio") {
      const row = document.createElement("p");
      row.className = "history-set-row";
      row.textContent = `${Number(exercise.durationMinutes) || 0} minutes`;
      card.appendChild(row);
      container.appendChild(card);
      return;
    }

    (exercise.sets || []).forEach((set, index) => {
      const row = document.createElement("p");
      row.className = "history-set-row";
      const plannedWeight = Number(set.plannedWeight);
      const plannedReps = Number(set.plannedReps);
      const plannedRepTarget =
        parseExerciseRepTarget(set.plannedRepTarget ?? plannedReps)
          ?.label || String(plannedReps);
      const weightUnit = "kg";

      let text =
        `Set ${index + 1}: ` +
        `${Number(set.weight) || 0} ${weightUnit} × ` +
        `${Number(set.reps) || 0} reps`;

      if (
        Number.isFinite(plannedWeight) &&
        Number.isFinite(plannedReps)
      ) {
        text +=
          ` (planned ${plannedWeight} ${weightUnit} × ` +
          `${plannedRepTarget} reps)`;
      }

      row.textContent =
        text +
        (set.completed ? " ✓" : " — Not completed");

      card.appendChild(row);
    });

    container.appendChild(card);
  });

}
