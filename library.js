// FITNESS TRACKER — WORKOUT LIBRARY


// CREATE PROGRAMME
function createProgramme() {
  const durationWeeks = DEFAULT_PROGRAMME_WEEKS;

  const programmes = getProgrammes();

  const programme = {
    id: createId(),
    name: "New Programme",
    createdAt: new Date().toISOString(),
    schemaVersion: PROGRAMME_SCHEMA_VERSION,
    durationWeeks,
    currentWeek: 1,
    isDraft: true,

    weeks: Array.from(
      { length: durationWeeks },
      (_, index) => createProgrammeWeek(index + 1)
    ),

    days: []
  };

  programme.days =
    programme.weeks[0].trainingDays;

  programmes.push(programme);
  saveProgrammes(programmes);

  openProgrammeEditor(programme.id);
}


// ACTIVATE OR DEACTIVATE A PROGRAMME
let pendingActivationProgrammeId = null;

function refreshProgrammeViews() {
  renderLibrary();
  renderActiveWorkout();
  if (typeof updateDashboard === "function") updateDashboard();
}

function setActiveProgramme(id) {
  const programmes = getProgrammes();
  const programme = programmes.find(item => item.id === id);
  if (programme && !programme.activeRunId) {
    programme.activeRunId = createId();
    programme.activeRunStartedAt = new Date().toISOString();
    saveProgrammes(programmes);
  }
  localStorage.setItem(ACTIVE_KEY, id);
  viewedWorkoutProgrammeId = id;
  viewedWorkoutWeek = null;
  expandedWorkoutId = null;
  refreshProgrammeViews();
}

function deactivateProgramme(id) {
  if (getActiveProgrammeId() !== id) return;
  localStorage.removeItem(ACTIVE_KEY);
  viewedWorkoutProgrammeId = null;
  viewedWorkoutWeek = null;
  expandedWorkoutId = null;
  refreshProgrammeViews();
}

function restartProgramme(id) {
  const programmes = getProgrammes();
  const programme = programmes.find(item => item.id === id);
  if (!programme) return;

  programme.currentWeek = 1;
  programme.activeRunId = createId();
  programme.activeRunStartedAt = new Date().toISOString();
  programme.weeks = (programme.weeks || []).map((week, weekIndex) => ({
    ...week,
    id: createId(),
    number: weekIndex + 1,
    trainingDays: (week.trainingDays || []).map(workout => ({
      ...workout,
      id: createId(),
      exercises: (workout.exercises || []).map(exercise => ({
        ...exercise,
        id: createId()
      }))
    }))
  }));
  programme.days = programme.weeks[0]?.trainingDays || [];
  saveProgrammes(programmes);
  setActiveProgramme(id);
}

function requestProgrammeActivation(id) {
  if (getActiveProgrammeId() === id) {
    deactivateProgramme(id);
    return;
  }

  const programme = getProgrammes().find(item => item.id === id);
  if (!programme) return;

  const hasProgress = programme.currentWeek > 1 || getWorkoutHistory().some(
    session => session.programmeId === id
  );

  if (!hasProgress && !getActiveProgrammeId()) {
    setActiveProgramme(id);
    return;
  }

  pendingActivationProgrammeId = id;
  const continueButton = document.getElementById("activateContinue");
  const message = document.getElementById("activationDialogMessage");

  if (continueButton) {
    continueButton.hidden = !hasProgress;
    continueButton.textContent = `Continue from Week ${programme.currentWeek}`;
  }
  if (message) {
    message.textContent = hasProgress
      ? "Start a fresh run or continue from where you left off."
      : "Activating this will pause your current programme without deleting its progress.";
  }

  document.getElementById("activationDialog")?.showModal();
}

function closeActivationDialog() {
  pendingActivationProgrammeId = null;
  document.getElementById("activationDialog")?.close();
}

document.getElementById("activateFromStart")?.addEventListener("click", () => {
  const id = pendingActivationProgrammeId;
  closeActivationDialog();
  if (id) restartProgramme(id);
});

document.getElementById("activateContinue")?.addEventListener("click", () => {
  const id = pendingActivationProgrammeId;
  closeActivationDialog();
  if (id) setActiveProgramme(id);
});

document.getElementById("cancelActivation")?.addEventListener(
  "click",
  closeActivationDialog
);

function activateProgramme(id) {
  requestProgrammeActivation(id);
}


// DELETE PROGRAMME
async function deleteProgramme(id) {
  const programme = getProgrammes().find(item => item.id === id);
  if (!await showSpotConfirm(
    "Delete this programme?",
    programme ? `${programme.name} and its planned workouts will be removed.` : "This cannot be undone.",
    { confirmText: "Delete", danger: true }
  )) return;

  const programmes = getProgrammes().filter(
    programme => programme.id !== id
  );

  saveProgrammes(programmes);

  if (getActiveProgrammeId() === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }

  renderLibrary();
  renderActiveWorkout();
}


// DISPLAY LIBRARY
function renderLibraryLegacy() {
  const container =
    document.getElementById("programmeLibrary");

  if (!container) return;

  const programmes = getProgrammes();
  const activeId = getActiveProgrammeId();

  container.innerHTML = "";

  if (programmes.length === 0) {
    container.innerHTML =
      "<div class='card empty-state-card'><p>No programmes saved yet.</p></div>";

    return;
  }

  let lastLibrarySection = null;
  programmes.sort((a, b) => {
    if (a.id === activeId) return -1;
    if (b.id === activeId) return 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  }).forEach(programme => {
    const section = programme.id === activeId
      ? "Active"
      : (String(programme.name || "#").trim().charAt(0).toUpperCase() || "#");
    if (section !== lastLibrarySection) {
      const label = document.createElement("div");
      label.className = "library-section-label";
      label.textContent = section;
      container.appendChild(label);
      lastLibrarySection = section;
    }
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = formatSpotTitle(programme.name);

    const status = document.createElement("p");
    status.textContent =
      programme.id === activeId
        ? "🟠 Active Programme"
        : "Saved Programme";

    const editButton =
      document.createElement("button");

    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      openProgrammeEditor(programme.id);
    });

    const activateButton =
      document.createElement("button");

    activateButton.textContent =
      programme.id === activeId
        ? "Active"
        : "Activate";

    activateButton.disabled =
      programme.id === activeId;

    activateButton.addEventListener("click", () => {
      activateProgramme(programme.id);
    });

    const deleteButton =
      document.createElement("button");

    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      deleteProgramme(programme.id);
    });

    card.append(
      title,
      status,
      editButton,
      activateButton,
      deleteButton
    );

    container.appendChild(card);
  });
}


// WORKOUTS PAGE VIEW STATE
let viewedWorkoutWeek = null;
let viewedWorkoutProgrammeId = null;
let expandedWorkoutId = null;

function animateWorkoutWeek(direction) {
  const container = document.getElementById("activeWorkout");
  if (!container) return;

  container.classList.remove(
    "week-enter-from-left",
    "week-enter-from-right"
  );

  void container.offsetWidth;

  container.classList.add(
    direction === "back"
      ? "week-enter-from-left"
      : "week-enter-from-right"
  );

  setTimeout(() => {
    container.classList.remove(
      "week-enter-from-left",
      "week-enter-from-right"
    );
  }, 240);
}


// LOAD WORKOUT HISTORY SAFELY
function getWorkoutHistory() {
  try {
    const history = JSON.parse(
      localStorage.getItem(
        "fitness_workout_history"
      ) || "[]"
    );

    return Array.isArray(history)
      ? history
      : [];
  } catch {
    return [];
  }
}


// CHECK WHETHER A WORKOUT IS COMPLETE
function isWorkoutComplete(
  programme,
  week,
  workout,
  history
) {
  return history.some(session => {
    const sameProgramme =
      session.programmeId === programme.id;

    const sameWorkout =
      session.workoutId === workout.id;

    // Older history entries may not have a week ID.
    const sameWeek =
      !session.weekId ||
      session.weekId === week.id;

    return (
      sameProgramme &&
      sameWorkout &&
      sameWeek
    );
  });
}


// GET UNFINISHED WORKOUTS FOR A WEEK
function getRemainingWorkouts(
  programme,
  week,
  history
) {
  const trainingDays =
    week?.trainingDays || [];

  return trainingDays.filter(workout => {
    return !isWorkoutComplete(
      programme,
      week,
      workout,
      history
    );
  });
}

// ADVANCE AUTOMATICALLY WHEN THE CURRENT WEEK IS COMPLETE
function advanceProgrammeAfterCompletedWorkout(
  programmeId,
  completedWeekId
) {
  const programmes = getProgrammes();

  const programmeIndex =
    programmes.findIndex(
      programme => programme.id === programmeId
    );

  if (programmeIndex === -1) {
    return { advanced: false };
  }

  const programme = programmes[programmeIndex];

  const currentWeek =
    programme.weeks?.[programme.currentWeek - 1];

  if (
    !currentWeek ||
    (
      completedWeekId &&
      currentWeek.id !== completedWeekId
    )
  ) {
    return { advanced: false };
  }

  const trainingDays =
    currentWeek.trainingDays || [];

  if (trainingDays.length === 0) {
    return { advanced: false };
  }

  const history = getWorkoutHistory();

  const weekComplete = trainingDays.every(
    workout =>
      isWorkoutComplete(
        programme,
        currentWeek,
        workout,
        history
      )
  );

  if (!weekComplete) {
    return { advanced: false };
  }

  if (
    programme.currentWeek >=
    programme.durationWeeks
  ) {
    return {
      advanced: false,
      programmeComplete: true
    };
  }

  programme.currentWeek += 1;

  programme.days =
    programme.weeks[
      programme.currentWeek - 1
    ].trainingDays;

  programmes[programmeIndex] = programme;
  saveProgrammes(programmes);

  viewedWorkoutWeek = programme.currentWeek;
  expandedWorkoutId = null;

  return {
    advanced: true,
    newWeek: programme.currentWeek
  };
}

// MANUALLY CHANGE THE ACTIVE TRAINING WEEK
function changeActiveProgrammeWeek(
  programmeId,
  targetWeekNumber
) {
  const programmes = getProgrammes();

  const programmeIndex =
    programmes.findIndex(
      programme => programme.id === programmeId
    );

  if (programmeIndex === -1) return;

  const programme = programmes[programmeIndex];

  if (
    targetWeekNumber < 1 ||
    targetWeekNumber > programme.durationWeeks
  ) {
    return;
  }

  const targetWeek =
    programme.weeks[targetWeekNumber - 1];

  if (!targetWeek) return;

  programme.currentWeek = targetWeekNumber;

  // Keep the compatibility days list connected
  // to the newly active week.
  programme.days = targetWeek.trainingDays;

  programmes[programmeIndex] = programme;
  saveProgrammes(programmes);

  viewedWorkoutWeek = targetWeekNumber;
  expandedWorkoutId = null;

  renderActiveWorkout();
}


// DISPLAY ACTIVE PROGRAMME ON WORKOUTS PAGE
function renderActiveWorkoutLegacy() {
  const container =
    document.getElementById("activeWorkout");

  if (!container) return;

  const programmes = getProgrammes();
  const activeId = getActiveProgrammeId();

  const programme = programmes.find(
    item => item.id === activeId
  );

  container.innerHTML = "";

  if (!programme) {
    container.textContent =
      "No active programme. Activate one in your Library.";

    return;
  }

  // Reset the view when another programme is activated.
  if (
    viewedWorkoutProgrammeId !== programme.id
  ) {
    viewedWorkoutProgrammeId = programme.id;
    viewedWorkoutWeek =
      programme.currentWeek || 1;

    expandedWorkoutId = null;
  }

  // Keep the viewed week within valid limits.
  if (
    !viewedWorkoutWeek ||
    viewedWorkoutWeek < 1 ||
    viewedWorkoutWeek > programme.durationWeeks
  ) {
    viewedWorkoutWeek =
      programme.currentWeek || 1;
  }

  const history = getWorkoutHistory();

  const currentWeek =
    programme.weeks?.[
      programme.currentWeek - 1
    ];

  const currentDays =
    currentWeek?.trainingDays || [];

  const currentRemaining =
    getRemainingWorkouts(
      programme,
      currentWeek,
      history
    );

  const completedCount =
    currentDays.length -
    currentRemaining.length;

  const progressPercentage =
    currentDays.length > 0
      ? Math.round(
          (completedCount / currentDays.length) *
          100
        )
      : 0;


  // PROGRAMME PROGRESS CELL
  const progressCard =
    document.createElement("div");

  progressCard.className = "card programme-progress";

  const programmeHeading =
    document.createElement("h2");

  programmeHeading.textContent = programme.name;

  const currentWeekText =
    document.createElement("p");

  currentWeekText.textContent =
    `Current week: Week ${programme.currentWeek} ` +
    `of ${programme.durationWeeks}`;

  const completionText =
    document.createElement("p");

  completionText.textContent =
    `${completedCount} of ${currentDays.length} ` +
    `workouts completed`;

  const progressTrack =
    document.createElement("div");

  progressTrack.className = "progress-track";

  const progressFill =
    document.createElement("div");

  progressFill.className = "progress-fill";
  progressFill.style.width =
    `${progressPercentage}%`;

  progressTrack.appendChild(progressFill);

  const nextWorkoutText =
    document.createElement("p");

  if (currentRemaining.length > 0) {
    nextWorkoutText.textContent =
      `Next workout: ${currentRemaining[0].name}`;
  } else if (currentDays.length === 0) {
    nextWorkoutText.textContent =
      "No workouts have been added to this week.";
  } else {
    nextWorkoutText.textContent =
      "All workouts in the current week are complete.";
  }

  progressCard.append(
    programmeHeading,
    currentWeekText,
    completionText,
    progressTrack,
    nextWorkoutText
  );


  // MANUAL ACTIVE-WEEK CONTROLS
  const activeWeekControls =
    document.createElement("div");

  activeWeekControls.className =
    "active-week-controls";

  const previousActiveButton =
    document.createElement("button");

  previousActiveButton.textContent =
    "‹ Previous Active Week";

  previousActiveButton.disabled =
    programme.currentWeek === 1;

  previousActiveButton.addEventListener(
    "click",
    () => {
      const targetWeek =
        programme.currentWeek - 1;

      const confirmed = confirm(
        `Make Week ${targetWeek} your current ` +
        `training week?`
      );

      if (!confirmed) return;

      changeActiveProgrammeWeek(
        programme.id,
        targetWeek
      );
    }
  );

  const nextActiveButton =
    document.createElement("button");

  nextActiveButton.textContent =
    "Next Active Week ›";

  nextActiveButton.disabled =
    programme.currentWeek ===
    programme.durationWeeks;

  nextActiveButton.addEventListener(
    "click",
    () => {
      const targetWeek =
        programme.currentWeek + 1;

      const unfinishedCount =
        currentRemaining.length;

      let message =
        `Make Week ${targetWeek} your current ` +
        `training week?`;

      if (unfinishedCount > 0) {
        message +=
          ` Week ${programme.currentWeek} still has ` +
          `${unfinishedCount} unfinished workout` +
          `${unfinishedCount === 1 ? "" : "s"}.`;
      }

      const confirmed = confirm(message);

      if (!confirmed) return;

      changeActiveProgrammeWeek(
        programme.id,
        targetWeek
      );
    }
  );

  activeWeekControls.append(
    previousActiveButton,
    nextActiveButton
  );

  progressCard.appendChild(
    activeWeekControls
  );

  container.appendChild(progressCard);


  // WEEK BROWSING CELL
  const browseCard =
    document.createElement("div");

  browseCard.className = "card";

  const browseHeading =
    document.createElement("h2");

  browseHeading.textContent =
    "Browse Programme";

  const weekNavigation =
    document.createElement("div");

  weekNavigation.className =
    "week-navigation";

  const previousWeekButton =
    document.createElement("button");

  previousWeekButton.textContent =
    "‹ Previous";

  previousWeekButton.disabled =
    viewedWorkoutWeek === 1;

  previousWeekButton.addEventListener(
    "click",
    () => {
      viewedWorkoutWeek -= 1;
      expandedWorkoutId = null;
      renderActiveWorkout();
    }
  );

  const weekLabel =
    document.createElement("strong");

  weekLabel.textContent =
    `Week ${viewedWorkoutWeek} ` +
    `of ${programme.durationWeeks}`;

  const nextWeekButton =
    document.createElement("button");

  nextWeekButton.textContent = "Next ›";

  nextWeekButton.disabled =
    viewedWorkoutWeek ===
    programme.durationWeeks;

  nextWeekButton.addEventListener(
    "click",
    () => {
      viewedWorkoutWeek += 1;
      expandedWorkoutId = null;
      renderActiveWorkout();
    }
  );

  weekNavigation.append(
    previousWeekButton,
    weekLabel,
    nextWeekButton
  );

  browseCard.append(
    browseHeading,
    weekNavigation
  );

  if (
    viewedWorkoutWeek !== programme.currentWeek
  ) {
    const viewingMessage =
      document.createElement("p");

    viewingMessage.textContent =
      `Viewing Week ${viewedWorkoutWeek}. ` +
      `Your current training week is ` +
      `Week ${programme.currentWeek}.`;

    const returnButton =
      document.createElement("button");

    returnButton.className = "primary-button";
    returnButton.textContent =
      "Return to Current Week";

    returnButton.addEventListener(
      "click",
      () => {
        viewedWorkoutWeek =
          programme.currentWeek;

        expandedWorkoutId = null;
        renderActiveWorkout();
      }
    );

    browseCard.append(
      viewingMessage,
      returnButton
    );
  } else {
    const currentMessage =
      document.createElement("p");

    currentMessage.textContent =
      "You are viewing your current training week.";

    browseCard.appendChild(currentMessage);
  }

  container.appendChild(browseCard);


  // SELECTED WEEK
  const selectedWeek =
    programme.weeks?.[
      viewedWorkoutWeek - 1
    ];

  const selectedDays =
    selectedWeek?.trainingDays || [];

  if (selectedDays.length === 0) {
    const emptyCard =
      document.createElement("div");

    emptyCard.className = "card";

    const message =
      document.createElement("p");

    message.textContent =
      "This week has no training days yet.";

    emptyCard.appendChild(message);
    container.appendChild(emptyCard);

    return;
  }

  const remainingWorkouts =
    getRemainingWorkouts(
      programme,
      selectedWeek,
      history
    );

  if (remainingWorkouts.length === 0) {
    const completeCard =
      document.createElement("div");

    completeCard.className = "card";

    const message =
      document.createElement("p");

    message.textContent =
      "All workouts in this week are complete.";

    completeCard.appendChild(message);
    container.appendChild(completeCard);

    return;
  }


  // EXPAND THE NEXT WORKOUT BY DEFAULT
  const expandedWorkoutStillExists =
    remainingWorkouts.some(
      workout =>
        workout.id === expandedWorkoutId
    );

  if (
    expandedWorkoutId === null ||
    (
      expandedWorkoutId &&
      !expandedWorkoutStillExists
    )
  ) {
    expandedWorkoutId =
      remainingWorkouts[0].id;
  }


  // CREATE AN INDIVIDUAL WORKOUT CELL
  function createWorkoutCard(
    workout,
    position,
    isNextWorkout
  ) {
    const workoutCard =
      document.createElement("div");

    workoutCard.className = "card";

    const workoutTitle =
      document.createElement("h3");

    workoutTitle.textContent =
      isNextWorkout
        ? workout.name
        : `${position + 1}. ${workout.name}`;

    const toggleButton =
      document.createElement("button");

    const isExpanded =
      expandedWorkoutId === workout.id;

    toggleButton.textContent =
      isExpanded
        ? "Hide Details"
        : "View Details";

    toggleButton.addEventListener(
      "click",
      () => {
        expandedWorkoutId =
          expandedWorkoutId === workout.id
            ? ""
            : workout.id;

        renderActiveWorkout();
      }
    );

    workoutCard.append(
      workoutTitle,
      toggleButton
    );

    if (isExpanded) {
      if (
        !workout.exercises ||
        workout.exercises.length === 0
      ) {
        const emptyMessage =
          document.createElement("p");

        emptyMessage.textContent =
          "No exercises added yet.";

        workoutCard.appendChild(
          emptyMessage
        );
      } else {
        workout.exercises.forEach(
          exercise => {
            const exerciseRow =
              document.createElement("div");

            exerciseRow.className =
              "exercise-row";

            const exerciseName =
              document.createElement("strong");

            exerciseName.textContent =
              formatSpotTitle(exercise.name);

            const exerciseDetails =
              document.createElement("p");

            exerciseDetails.textContent =
              formatExercisePrescription(exercise);

            exerciseRow.append(
              exerciseName,
              exerciseDetails
            );

            if (exercise.note) {
              const note = document.createElement("p");
              note.className = "exercise-note";
              note.textContent = exercise.note;
              exerciseRow.appendChild(note);
            }


            workoutCard.appendChild(
              exerciseRow
            );
          }
        );
      }

      if (
        viewedWorkoutWeek ===
        programme.currentWeek
      ) {
        const startButton =
          document.createElement("button");

        startButton.className =
          "primary-button";

        startButton.textContent =
          "Start Workout";

        startButton.addEventListener(
          "click",
          () => {
            startWorkout(workout.id);
          }
        );

        workoutCard.appendChild(
          startButton
        );
      } else {
        const viewingMessage =
          document.createElement("p");

        viewingMessage.textContent =
          "This week is available to view only.";

        workoutCard.appendChild(
          viewingMessage
        );
      }
    }

    return workoutCard;
  }


  // NEXT WORKOUT
  const nextHeading =
    document.createElement("h2");

  nextHeading.textContent =
    viewedWorkoutWeek === programme.currentWeek
      ? "Next Workout"
      : `Next Workout in Week ${viewedWorkoutWeek}`;

  container.appendChild(nextHeading);

  container.appendChild(
    createWorkoutCard(
      remainingWorkouts[0],
      0,
      true
    )
  );


  // UPCOMING WORKOUTS
  const upcomingWorkouts =
    remainingWorkouts.slice(1);

  if (upcomingWorkouts.length > 0) {
    const upcomingHeading =
      document.createElement("h2");

    upcomingHeading.textContent =
      "Upcoming Workouts";

    container.appendChild(
      upcomingHeading
    );

    upcomingWorkouts.forEach(
      (workout, index) => {
        container.appendChild(
          createWorkoutCard(
            workout,
            index,
            false
          )
        );
      }
    );
  }
}


// COMPACT LIBRARY CARDS
function renderLibrary() {
  const container = document.getElementById("programmeLibrary");
  if (!container) return;

  const programmes = getProgrammes();
  const activeId = getActiveProgrammeId();
  const history = getWorkoutHistory();

  container.innerHTML = "";

  if (programmes.length === 0) {
    container.innerHTML = "<div class='card empty-state-card'><p>No programmes saved yet.</p></div>";
    return;
  }

  let lastLibrarySection = null;
  programmes.sort((a, b) => {
    if (a.id === activeId) return -1;
    if (b.id === activeId) return 1;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
  }).forEach(programme => {
    const section = programme.id === activeId
      ? "Active"
      : (String(programme.name || "#").trim().charAt(0).toUpperCase() || "#");
    if (section !== lastLibrarySection) {
      const label = document.createElement("div");
      label.className = "library-section-label";
      label.textContent = section;
      container.appendChild(label);
      lastLibrarySection = section;
    }
    const card = document.createElement("div");
    card.className = "card programme-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${programme.name}`);

    if (programme.id === activeId) {
      card.classList.add("active-programme");
    }

    const header = document.createElement("div");
    header.className = "compact-card-header";

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = programme.name;

    const details = document.createElement("p");
    details.textContent =
      programme.isDraft
        ? `Draft • ${programme.durationWeeks} weeks`
        : `${programme.durationWeeks} weeks • Week ${programme.currentWeek}`;
    copy.append(title, details);

    const chevron = document.createElement("span");
    chevron.className = "programme-card-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = '<svg><use href="#icon-arrow-right"></use></svg>';
    header.append(copy, chevron);
    card.appendChild(header);

    const activationButton = document.createElement("button");
    activationButton.type = "button";
    activationButton.className = "programme-activation-button";
    activationButton.classList.toggle("is-active", programme.id === activeId);
    activationButton.textContent = programme.isDraft
      ? "Draft"
      : programme.id === activeId
        ? "Active"
        : "Activate";
    activationButton.disabled = Boolean(programme.isDraft);
    activationButton.setAttribute(
      "aria-pressed",
      programme.id === activeId ? "true" : "false"
    );
    activationButton.addEventListener("click", event => {
      event.stopPropagation();
      if (programme.isDraft) return;
      requestProgrammeActivation(programme.id);
    });
    card.appendChild(activationButton);

    if (programme.id === activeId) {
      const week = programme.weeks?.[programme.currentWeek - 1];
      const days = week?.trainingDays || [];
      const remaining = getRemainingWorkouts(programme, week, history);
      const completed = days.length - remaining.length;
      const percentage = days.length
        ? Math.round((completed / days.length) * 100)
        : 0;

      const status = document.createElement("span");
      status.className = "status-label";
      status.textContent = `${percentage}% complete`;
      card.appendChild(status);
    }

    card.addEventListener("click", event => {
      if (event.target.closest(".programme-activation-button")) return;
      openProgrammeEditor(programme.id);
    });
    card.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
        event.preventDefault();
        openProgrammeEditor(programme.id);
      }
    });

    container.appendChild(card);
  });
}


// COMPACT WORKOUTS PAGE
function renderActiveWorkout() {
  const container = document.getElementById("activeWorkout");
  if (!container) return;

  const programme = getProgrammes().find(
    item => item.id === getActiveProgrammeId()
  );

  container.innerHTML = "";

  if (!programme) {
    container.innerHTML = "<div class='card empty-state-card'><p>No active programme. Activate one in your Library.</p></div>";
    return;
  }

  if (viewedWorkoutProgrammeId !== programme.id) {
    viewedWorkoutProgrammeId = programme.id;
    viewedWorkoutWeek = programme.currentWeek || 1;
    expandedWorkoutId = null;
  }

  viewedWorkoutWeek = Math.min(
    Math.max(viewedWorkoutWeek || programme.currentWeek || 1, 1),
    programme.durationWeeks
  );

  const history = getWorkoutHistory();

  const navigation = document.createElement("div");
  navigation.className = "card unified-week-card";
  const navRow = document.createElement("div");
  navRow.className = "week-navigation";

  const previous = document.createElement("button");
  previous.innerHTML = '<svg aria-hidden="true"><use href="#icon-arrow-left"></use></svg>';
  previous.setAttribute("aria-label", "Previous week");
  previous.disabled = viewedWorkoutWeek === 1;
  previous.addEventListener("click", () => {
    viewedWorkoutWeek -= 1;
    expandedWorkoutId = null;
    renderActiveWorkout();
    animateWorkoutWeek("back");
  });

  const weekCopy = document.createElement("div");
  weekCopy.className = "week-navigation-copy";
  const weekName = document.createElement("strong");
  weekName.textContent = `Week ${viewedWorkoutWeek} of ${programme.durationWeeks}`;
  weekCopy.appendChild(weekName);
  if (viewedWorkoutWeek === programme.currentWeek) {
    const current = document.createElement("span");
    current.className = "status-label";
    current.textContent = "Current";
    weekCopy.appendChild(current);
  }

  const next = document.createElement("button");
  next.innerHTML = '<svg aria-hidden="true"><use href="#icon-arrow-right"></use></svg>';
  next.setAttribute("aria-label", "Next week");
  next.disabled = viewedWorkoutWeek === programme.durationWeeks;
  next.addEventListener("click", () => {
    viewedWorkoutWeek += 1;
    expandedWorkoutId = null;
    renderActiveWorkout();
    animateWorkoutWeek("forward");
  });

  navRow.append(previous, weekCopy, next);
  navigation.appendChild(navRow);
  container.appendChild(navigation);

  const week = programme.weeks?.[viewedWorkoutWeek - 1];
  const remaining = getRemainingWorkouts(programme, week, history);

  if (expandedWorkoutId) {
    const workout = (week?.trainingDays || []).find(item => item.id === expandedWorkoutId);
    if (workout) {
      navigation.remove();
      const back = document.createElement("button");
      back.className = "icon-button workout-detail-back";
      back.setAttribute("aria-label", "Back to week");
      back.innerHTML =
        '<svg aria-hidden="true"><use href="#icon-arrow-left"></use></svg>';
      back.addEventListener("click", () => {
        expandedWorkoutId = null;
        renderActiveWorkout();
        if (window.workoutDetailReturnPage === "programmeOverview") {
          window.workoutDetailReturnPage = null;
          showPage("programmeOverview");
        }
      });
      const detailHeader = document.createElement("div");
      detailHeader.className = "workout-detail-header";
      const headerTitle = document.createElement("h2");
      headerTitle.textContent = formatSpotTitle(workout.name);
      detailHeader.append(back, headerTitle);
      container.appendChild(detailHeader);

      const detail = document.createElement("div");
      detail.className = "card workout-detail-card";

      (workout.exercises || []).forEach(exercise => {
        const row = document.createElement("div");
        row.className = "exercise-row";
        const exerciseName = document.createElement("strong");
        exerciseName.textContent = formatSpotTitle(exercise.name);
        if (exercise.starred) {
          const star = document.createElement("svg");
          star.classList.add("display-star");
          star.setAttribute("aria-label", "Starred exercise");
          star.innerHTML = '<use href="#icon-star-round"></use>';
          row.append(exerciseName, star);
        } else {
          row.appendChild(exerciseName);
        }
        const prescription = document.createElement("p");
        prescription.textContent = formatExercisePrescription(exercise);
        row.appendChild(prescription);
        if (exercise.note) {
          const note = document.createElement("p");
          note.className = "exercise-note";
          note.textContent = exercise.note;
          row.appendChild(note);
        }
        detail.appendChild(row);
      });

      const start = document.createElement("button");
      start.className = "primary-button workout-detail-start";
      start.textContent = "Start Workout";
      start.addEventListener("click", async () => {
        if (viewedWorkoutWeek !== programme.currentWeek) {
          changeActiveProgrammeWeek(programme.id, viewedWorkoutWeek);
        }
        startWorkout(workout.id);
      });
      detailHeader.appendChild(start);
      container.appendChild(detail);
      return;
    }
  }

  if (!week || (week.trainingDays || []).length === 0) {
    const empty = document.createElement("div");
    empty.className = "card empty-state-card";
    empty.innerHTML = "<p>This week has no training days yet.</p>";
    container.appendChild(empty);
    return;
  }

  if (remaining.length === 0) {
    const complete = document.createElement("div");
    complete.className = "card empty-state-card";
    complete.innerHTML = "<p>All workouts in this week are complete.</p>";
    container.appendChild(complete);
    return;
  }

  const isCurrentWeek =
    viewedWorkoutWeek === programme.currentWeek;

  const firstHeading = document.createElement("h2");
  firstHeading.className = "workout-group-heading";
  firstHeading.textContent = isCurrentWeek
    ? "Next Up"
    : "Upcoming";
  container.appendChild(firstHeading);

  remaining.forEach((workout, index) => {
    if (isCurrentWeek && index === 1) {
      const upcomingHeading = document.createElement("h2");
      upcomingHeading.className = "workout-group-heading";
      upcomingHeading.textContent = "Upcoming";
      container.appendChild(upcomingHeading);
    }

    const card = document.createElement("div");
    card.className = "card workout-summary-card";
    if (isCurrentWeek && index === 0) {
      card.classList.add("next-workout");
    } else {
      card.classList.add("upcoming-workout");
    }

    const header = document.createElement("div");
    header.className = "compact-card-header";
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = workout.name;
    const detail = document.createElement("p");
    const exerciseCount = (workout.exercises || []).length;
    detail.textContent = `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`;
    copy.append(title, detail);
    const chevron = document.createElement("span");
    chevron.className = "workout-card-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML =
      '<svg><use href="#icon-arrow-right"></use></svg>';
    header.append(copy, chevron);

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "primary-button compact-start-button";
    startButton.textContent = "Start Workout";
    startButton.addEventListener("click", async event => {
      event.stopPropagation();
      if (viewedWorkoutWeek !== programme.currentWeek) {
        changeActiveProgrammeWeek(programme.id, viewedWorkoutWeek);
      }
      startWorkout(workout.id);
    });

    card.appendChild(header);
    if (isCurrentWeek && index === 0) {
      card.appendChild(startButton);
    }
    card.addEventListener("click", () => {
      expandedWorkoutId = workout.id;
      renderActiveWorkout();
    });
    container.appendChild(card);
  });
}


// OPEN THE NEXT WORKOUT FROM THE DASHBOARD WITHOUT STARTING IT
function viewActiveWorkoutDetails(workoutId) {
  const programme = getProgrammes().find(
    item => item.id === getActiveProgrammeId()
  );

  if (!programme || !workoutId) return;

  viewedWorkoutProgrammeId = programme.id;
  viewedWorkoutWeek = programme.currentWeek || 1;
  expandedWorkoutId = workoutId;

  showPage("workouts");
  renderActiveWorkout();
}


// CONNECT CREATE BUTTON
document.getElementById("createProgramme")
  ?.addEventListener(
    "click",
    createProgramme
  );


// INITIALISE
renderLibrary();
renderActiveWorkout();


// OPEN PROGRAMME EDITOR
function openProgrammeEditor(id) {
  const programme = getProgrammes().find(
    programme => programme.id === id
  );

  if (!programme) return;

  window.editingProgrammeId = id;
  if (typeof prepareProgrammeEditor === "function") prepareProgrammeEditor(id);

  showPage("programmeEditor");

  if (
    typeof renderProgrammeEditor ===
    "function"
  ) {
    renderProgrammeEditor();
  }
}
