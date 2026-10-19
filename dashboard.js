// FITNESS TRACKER — DASHBOARD

let selectedDays = 30;

const weightForm =
  document.getElementById("weightForm");

const weightDate =
  document.getElementById("weightDate");

const weightInput =
  document.getElementById("weightInput");

const weightModal =
  document.getElementById("weightModal");

const weightMessage =
  document.getElementById("weightMessage");

const openWeightModal =
  document.getElementById("openWeightModal");

const cancelWeightModal =
  document.getElementById("cancelWeightModal");

const toggleWeightFilters =
  document.getElementById("toggleWeightFilters");

const weightFilterOptions =
  document.getElementById("weightFilterOptions");


// TODAY'S DATE
function todayString() {
  const date = new Date();

  const year = date.getFullYear();

  const month =
    String(date.getMonth() + 1).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// CONVERT A DATE INTO A NUMBER
function dateToNumber(date) {
  return new Date(
    `${date}T12:00:00`
  ).getTime();
}


// GET THE EXACT TIME OF A WEIGHT ENTRY
function weightEntryTime(entry, index = 0) {
  if (
    entry.recordedAt &&
    Number.isFinite(
      new Date(entry.recordedAt).getTime()
    )
  ) {
    return new Date(entry.recordedAt).getTime();
  }

  // Existing measurements do not have recordedAt.
  // Keep them compatible by positioning them at midday.
  return dateToNumber(entry.date) + index;
}


// GET VALID WEIGHT ENTRIES
function getValidWeights() {
  return FitnessStorage.getWeights()
    .filter(entry =>
      entry &&
      typeof entry.date === "string" &&
      Number.isFinite(entry.weight) &&
      Number.isFinite(
        dateToNumber(entry.date)
      )
    )
    .map((entry, index) => ({
      ...entry,
      chartTime:
        weightEntryTime(entry, index)
    }))
    .sort(
      (a, b) =>
        a.chartTime - b.chartTime
    );
}


// CREATE A TIMESTAMP USING THE SELECTED DATE
function createWeightTimestamp(date) {
  const now = new Date();

  const hours =
    String(now.getHours()).padStart(2, "0");

  const minutes =
    String(now.getMinutes()).padStart(2, "0");

  const seconds =
    String(now.getSeconds()).padStart(2, "0");

  const milliseconds =
    String(now.getMilliseconds()).padStart(3, "0");

  return new Date(
    `${date}T${hours}:${minutes}:${seconds}.${milliseconds}`
  ).toISOString();
}


// OPEN WEIGHT POP-UP
openWeightModal?.addEventListener(
  "click",
  function() {
    weightDate.value = todayString();
    weightDate.max = todayString();

    const savedWeights =
      getValidWeights();

    weightInput.value =
      savedWeights.length
        ? savedWeights[
            savedWeights.length - 1
          ].weight.toFixed(1)
        : "";

    weightMessage.textContent = "";
    weightModal.showModal();
  }
);


// CLOSE WEIGHT POP-UP
cancelWeightModal?.addEventListener(
  "click",
  function() {
    weightModal.close();
  }
);


// SAVE A NEW WEIGHT ENTRY
weightForm?.addEventListener(
  "submit",
  function(event) {
    event.preventDefault();

    const date = weightDate.value;
    const weight = Number(weightInput.value);

    if (
      !date ||
      !Number.isFinite(dateToNumber(date)) ||
      dateToNumber(date) >
        dateToNumber(todayString()) ||
      !Number.isFinite(weight) ||
      weight < 20 ||
      weight > 300
    ) {
      weightMessage.textContent =
        "Please enter a valid date and weight.";

      return;
    }

    const weights =
      FitnessStorage.getWeights();

    /*
     * Append the measurement instead of replacing
     * another measurement from the same date.
     */
    weights.push({
      id: createId(),
      date,
      recordedAt:
        createWeightTimestamp(date),
      weight
    });

    weights.sort(
      (a, b) =>
        weightEntryTime(a) -
        weightEntryTime(b)
    );

    try {
      FitnessStorage.saveWeights(weights);

      weightModal.close();

      weightMessage.textContent =
        "Weight saved successfully!";

      updateDashboard();
    } catch {
      weightMessage.textContent =
        "Unable to save your measurement.";
    }
  }
);


// OPEN OR CLOSE FILTER OPTIONS
toggleWeightFilters?.addEventListener(
  "click",
  function() {
    const willOpen =
      weightFilterOptions.hidden;

    weightFilterOptions.hidden =
      !willOpen;

    toggleWeightFilters.setAttribute(
      "aria-expanded",
      String(willOpen)
    );
  }
);


// SELECT A TIME FILTER
document
  .querySelectorAll(
    "#weightFilterOptions button"
  )
  .forEach(button => {
    button.addEventListener(
      "click",
      function() {
        const value =
          button.dataset.days;

        selectedDays =
          value === "all"
            ? "all"
            : Number(value);

        document
          .querySelectorAll(
            "#weightFilterOptions button"
          )
          .forEach(filterButton => {
            filterButton.classList.remove(
              "active"
            );
          });

        button.classList.add("active");

        toggleWeightFilters.textContent =
          `Filter: ${button.textContent.trim()} ▾`;

        weightFilterOptions.hidden = true;

        toggleWeightFilters.setAttribute(
          "aria-expanded",
          "false"
        );

        drawWeightChart();
      }
    );
  });


// UPDATE WORKOUT SUMMARY
function updateWorkoutSummary() {
  const nextName =
    document.getElementById(
      "nextWorkoutName"
    );

  const nextDetails =
    document.getElementById(
      "nextWorkoutDetails"
    );

  const progressCount =
    document.getElementById(
      "weeklyProgressCount"
    );

  const progressLabel =
    document.getElementById(
      "weeklyProgressLabel"
    );

  const progressFill =
    document.getElementById(
      "weeklyProgressFill"
    );

  if (
    !nextName ||
    !nextDetails ||
    !progressCount ||
    !progressLabel ||
    !progressFill
  ) {
    return;
  }

  const programmes = getProgrammes();

  const programme = programmes.find(
    item =>
      item.id === getActiveProgrammeId()
  );

  if (!programme) {
    nextName.textContent =
      "No workout scheduled";

    nextDetails.textContent =
      "Activate a programme in your Library.";

    progressCount.textContent = "0 / 0";

    progressLabel.textContent =
      "Workouts completed";

    progressFill.style.width = "0%";

    return;
  }

  const week =
    programme.weeks?.[
      programme.currentWeek - 1
    ];

  const trainingDays =
    week?.trainingDays || [];

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

  const remainingWorkouts =
    trainingDays.filter(workout => {
      return !history.some(session => {
        const sameProgramme =
          session.programmeId ===
          programme.id;

        const sameWorkout =
          session.workoutId === workout.id;

        const sameWeek =
          !session.weekId ||
          session.weekId === week?.id;

        return (
          sameProgramme &&
          sameWorkout &&
          sameWeek
        );
      });
    });

  const completed =
    trainingDays.length -
    remainingWorkouts.length;

  const percentage =
    trainingDays.length > 0
      ? Math.round(
          (
            completed /
            trainingDays.length
          ) * 100
        )
      : 0;

  progressCount.textContent =
    `${completed} / ${trainingDays.length}`;

  progressLabel.textContent =
    `Week ${programme.currentWeek} of ` +
    `${programme.durationWeeks}`;

  progressFill.style.width =
    `${percentage}%`;

  if (remainingWorkouts.length > 0) {
    nextName.textContent =
      remainingWorkouts[0].name;

    nextDetails.textContent =
      `${programme.name} • ` +
      `Week ${programme.currentWeek}`;
  } else if (trainingDays.length === 0) {
    nextName.textContent =
      "No workouts added";

    nextDetails.textContent =
      `${programme.name} • ` +
      `Week ${programme.currentWeek}`;
  } else {
    nextName.textContent =
      "Week complete";

    nextDetails.textContent =
      `${programme.name} • Great work!`;
  }
}


// UPDATE DASHBOARD
function updateDashboard() {
  updateWorkoutSummary();

  const weights = getValidWeights();

  const display =
    document.getElementById(
      "currentWeight"
    );

  if (weights.length > 0) {
    display.textContent =
      `${weights[
        weights.length - 1
      ].weight.toFixed(1)} kg`;
  } else {
    display.textContent = "-- kg";
  }

  drawWeightChart();
}


// FORMAT A GRAPH DATE
function formatGraphDate(timestamp) {
  return new Date(timestamp)
    .toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short"
      }
    );
}


// DRAW WEIGHT GRAPH
function drawWeightChart() {
  const container =
    document.getElementById("weightChart");

  if (!container) return;

  const now = Date.now();

  const allWeights =
    getValidWeights();

  let start;

  if (selectedDays === "all") {
    start = allWeights.length
      ? allWeights[0].chartTime
      : now;
  } else {
    start =
      now -
      (selectedDays - 1) *
      86400000;
  }

  const weights =
    allWeights.filter(entry =>
      entry.chartTime >= start &&
      entry.chartTime <= now
    );

  const values =
    weights.map(entry => entry.weight);

  const minimum =
    values.length
      ? Math.min(...values)
      : 80;

  const maximum =
    values.length
      ? Math.max(...values)
      : 90;

  const padding =
    Math.max(
      1,
      (maximum - minimum) * 0.2
    );

  const minY = minimum - padding;
  const maxY = maximum + padding;

  const left = 45;
  const right = 310;
  const top = 20;
  const bottom = 155;

  const firstTime =
    weights.length
      ? weights[0].chartTime
      : start;

  const finalTime =
    weights.length
      ? weights[
          weights.length - 1
        ].chartTime
      : now;

  const chartStart =
    selectedDays === "all"
      ? firstTime
      : start;

  const chartEnd =
    selectedDays === "all"
      ? finalTime
      : now;

  const xPosition = timestamp => {
    if (chartStart === chartEnd) {
      return (left + right) / 2;
    }

    return (
      left +
      (
        (timestamp - chartStart) /
        (chartEnd - chartStart)
      ) *
      (right - left)
    );
  };

  const yPosition = value => {
    return (
      bottom -
      (
        (value - minY) /
        (maxY - minY)
      ) *
      (bottom - top)
    );
  };

  const points =
    weights.map(entry => ({
      x: xPosition(entry.chartTime),
      y: yPosition(entry.weight),
      date: entry.date,
      time: entry.chartTime,
      weight: entry.weight
    }));

  const path =
    points.map((point, index) => {
      return (
        `${index === 0 ? "M" : "L"} ` +
        `${point.x} ${point.y}`
      );
    }).join(" ");

  let svg = "";

  // GRID LINES
  for (let i = 0; i <= 4; i++) {
    const y =
      top +
      i * (bottom - top) / 4;

    const value =
      maxY -
      i * (maxY - minY) / 4;

    svg += `
      <line
        x1="${left}"
        y1="${y}"
        x2="${right}"
        y2="${y}"
        stroke="#444"
      />

      <text
        x="3"
        y="${y + 4}"
        fill="#b0b0b0"
        font-size="11"
      >
        ${value.toFixed(1)}
      </text>
    `;
  }

  // ORANGE GRAPH LINE
  if (points.length > 0) {
    svg += `
      <path
        d="${path}"
        fill="none"
        stroke="#ff8c00"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    `;
  }

  // MEASUREMENT POINTS
  points.forEach(point => {
    const description =
      new Date(point.time)
        .toLocaleString("en-GB");

    svg += `
      <circle
        cx="${point.x}"
        cy="${point.y}"
        r="5"
        fill="#ff8c00"
      >
        <title>
          ${description}: ${point.weight} kg
        </title>
      </circle>
    `;
  });

  const startLabel =
    weights.length
      ? formatGraphDate(chartStart)
      : "Start";

  const endLabel =
    weights.length
      ? formatGraphDate(chartEnd)
      : "Today";

  svg += `
    <text
      x="${left}"
      y="180"
      fill="#b0b0b0"
      font-size="11"
    >
      ${startLabel}
    </text>

    <text
      x="${right}"
      y="180"
      text-anchor="end"
      fill="#b0b0b0"
      font-size="11"
    >
      ${endLabel}
    </text>
  `;

  container.innerHTML = `
    <svg
      viewBox="0 0 320 190"
      style="width:100%;height:auto;display:block;"
      role="img"
      aria-label="Bodyweight graph"
    >
      ${svg}
    </svg>

    ${
      weights.length === 0
        ? `
          <p style="text-align:center;font-size:13px;">
            No measurements in this time period
          </p>
        `
        : ""
    }
  `;
}


// INITIALISE DASHBOARD
updateDashboard();
