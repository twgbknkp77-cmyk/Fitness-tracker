// FITNESS TRACKER — WORKOUT LIBRARY


// CREATE PROGRAMME
function createProgramme() {
  const name = prompt("Enter your programme name:");

  if (!name || !name.trim()) return;

  const weeksInput = prompt("How many weeks?", "8");

  if (weeksInput === null) return;

  const durationWeeks = Number(weeksInput);

  if (
    !Number.isInteger(durationWeeks) ||
    durationWeeks < 1
  ) {
    alert(
      "Please enter a whole number of weeks (1 or more)."
    );

    return;
  }

  const programmes = getProgrammes();

  const programme = {
    id: createId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    schemaVersion: PROGRAMME_SCHEMA_VERSION,
    durationWeeks,
    currentWeek: 1,

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

  renderLibrary();
}


// ACTIVATE PROGRAMME
function activateProgramme(id) {
  localStorage.setItem(ACTIVE_KEY, id);

  renderLibrary();
  renderActiveWorkout();
}


// DELETE PROGRAMME
function deleteProgramme(id) {
  if (!confirm("Delete this programme?")) return;

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
      "<p>No programmes saved yet.</p>";

    return;
  }

  programmes.forEach(programme => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = programme.name;

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
    "← Previous Active Week";

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
    "Next Active Week →";

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
    "← Previous";

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

  nextWeekButton.textContent = "Next →";

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
              exercise.name;

            const exerciseDetails =
              document.createElement("p");

            exerciseDetails.textContent =
              `${exercise.sets} sets × ` +
              `${exercise.reps} reps` +
              (
                exercise.weight
                  ? ` • ${exercise.weight} kg`
                  : ""
              );

            exerciseRow.append(
              exerciseName,
              exerciseDetails
            );

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
    container.innerHTML = "<div class='card'><p>No programmes saved yet.</p></div>";
    return;
  }

  programmes.forEach(programme => {
    const card = document.createElement("div");
    card.className = "card programme-card";

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
      `${programme.durationWeeks} weeks • Week ${programme.currentWeek}`;
    copy.append(title, details);

    const menu = document.createElement("details");
    menu.className = "overflow-menu";
    const summary = document.createElement("summary");
    summary.textContent = "⋯";
    summary.setAttribute("aria-label", `${programme.name} options`);
    const panel = document.createElement("div");
    panel.className = "overflow-menu-panel";

    const edit = document.createElement("button");
    edit.textContent = "Edit programme";
    edit.addEventListener("click", () => openProgrammeEditor(programme.id));

    const activate = document.createElement("button");
    activate.textContent = programme.id === activeId ? "Active programme" : "Activate programme";
    activate.disabled = programme.id === activeId;
    activate.addEventListener("click", () => activateProgramme(programme.id));

    const remove = document.createElement("button");
    remove.textContent = "Delete programme";
    remove.className = "danger-action";
    remove.addEventListener("click", () => deleteProgramme(programme.id));

    panel.append(edit, activate, remove);
    menu.append(summary, panel);
    header.append(copy, menu);
    card.appendChild(header);

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
      status.textContent = `Active • ${percentage}% complete`;
      card.appendChild(status);
    }

    card.addEventListener("click", event => {
      if (event.target.closest(".overflow-menu")) return;
      openProgrammeEditor(programme.id);
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
    container.innerHTML = "<div class='card'><p>No active programme. Activate one in your Library.</p></div>";
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
  const currentWeek = programme.weeks?.[programme.currentWeek - 1];
  const currentDays = currentWeek?.trainingDays || [];
  const currentRemaining = getRemainingWorkouts(programme, currentWeek, history);
  const completed = currentDays.length - currentRemaining.length;
  const percentage = currentDays.length
    ? Math.round((completed / currentDays.length) * 100)
    : 0;

  const progress = document.createElement("div");
  progress.className = "card programme-progress";
  progress.innerHTML = `
    <div class="compact-card-header">
      <div><h2>${programme.name}</h2><p>Week ${programme.currentWeek} of ${programme.durationWeeks}</p></div>
      <strong>${percentage}%</strong>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${percentage}%"></div></div>
  `;
  container.appendChild(progress);

  const navigation = document.createElement("div");
  navigation.className = "card unified-week-card";
  const navRow = document.createElement("div");
  navRow.className = "week-navigation";

  const previous = document.createElement("button");
  previous.textContent = "‹";
  previous.setAttribute("aria-label", "Previous week");
  previous.disabled = viewedWorkoutWeek === 1;
  previous.addEventListener("click", () => {
    viewedWorkoutWeek -= 1;
    expandedWorkoutId = null;
    renderActiveWorkout();
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
  next.textContent = "›";
  next.setAttribute("aria-label", "Next week");
  next.disabled = viewedWorkoutWeek === programme.durationWeeks;
  next.addEventListener("click", () => {
    viewedWorkoutWeek += 1;
    expandedWorkoutId = null;
    renderActiveWorkout();
  });

  navRow.append(previous, weekCopy, next);
  navigation.appendChild(navRow);
  container.appendChild(navigation);

  const week = programme.weeks?.[viewedWorkoutWeek - 1];
  const remaining = getRemainingWorkouts(programme, week, history);

  if (expandedWorkoutId) {
    const workout = (week?.trainingDays || []).find(item => item.id === expandedWorkoutId);
    if (workout) {
      const back = document.createElement("button");
      back.className = "icon-button workout-detail-back";
      back.textContent = "←";
      back.setAttribute("aria-label", "Back to week");
      back.addEventListener("click", () => {
        expandedWorkoutId = null;
        renderActiveWorkout();
      });
      container.appendChild(back);

      const detail = document.createElement("div");
      detail.className = "card workout-detail-card";
      const title = document.createElement("h2");
      title.textContent = workout.name;
      detail.appendChild(title);

      (workout.exercises || []).forEach(exercise => {
        const row = document.createElement("div");
        row.className = "exercise-row";
        row.innerHTML = `<strong>${exercise.name}</strong><p>${exercise.sets} sets × ${exercise.reps} reps${exercise.weight ? ` • ${exercise.weight} kg` : ""}</p>`;
        detail.appendChild(row);
      });

      const start = document.createElement("button");
      start.className = "primary-button";
      start.textContent = viewedWorkoutWeek === programme.currentWeek
        ? "Start Workout"
        : `Make Week ${viewedWorkoutWeek} Current & Start`;
      start.addEventListener("click", () => {
        if (viewedWorkoutWeek !== programme.currentWeek) {
          if (!confirm(`Make Week ${viewedWorkoutWeek} your current training week?`)) return;
          changeActiveProgrammeWeek(programme.id, viewedWorkoutWeek);
        }
        startWorkout(workout.id);
      });
      detail.appendChild(start);
      container.appendChild(detail);
      return;
    }
  }

  if (!week || (week.trainingDays || []).length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = "<p>This week has no training days yet.</p>";
    container.appendChild(empty);
    return;
  }

  if (remaining.length === 0) {
    const complete = document.createElement("div");
    complete.className = "card";
    complete.innerHTML = "<p>All workouts in this week are complete.</p>";
    container.appendChild(complete);
    return;
  }

  remaining.forEach((workout, index) => {
    const card = document.createElement("div");
    card.className = "card workout-summary-card";
    if (index === 0) card.classList.add("next-workout");

    const header = document.createElement("div");
    header.className = "compact-card-header";
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = workout.name;
    const detail = document.createElement("p");
    const exerciseCount = (workout.exercises || []).length;
    detail.textContent = `${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`;
    copy.append(title, detail);
    header.appendChild(copy);

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "primary-button compact-start-button";
    startButton.textContent = viewedWorkoutWeek === programme.currentWeek
      ? "Start Workout"
      : "Make Current & Start";
    startButton.addEventListener("click", event => {
      event.stopPropagation();
      if (viewedWorkoutWeek !== programme.currentWeek) {
        if (!confirm(`Make Week ${viewedWorkoutWeek} your current training week?`)) return;
        changeActiveProgrammeWeek(programme.id, viewedWorkoutWeek);
      }
      startWorkout(workout.id);
    });

    card.append(header, startButton);
    card.addEventListener("click", () => {
      expandedWorkoutId = workout.id;
      renderActiveWorkout();
    });
    container.appendChild(card);
  });
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

  showPage("programmeEditor");

  if (
    typeof renderProgrammeEditor ===
    "function"
  ) {
    renderProgrammeEditor();
  }
}
