// FITNESS TRACKER - DASHBOARD

const savedWeightFilter = localStorage.getItem("spot_weight_graph_filter");
let selectedDays = savedWeightFilter === "all"
  ? "all"
  : Number.isFinite(Number(savedWeightFilter)) && Number(savedWeightFilter) > 0
    ? Number(savedWeightFilter)
    : 30;

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

const weightFormMessage =
  document.getElementById("weightFormMessage");

const openWeightModal =
  document.getElementById("openWeightModal");

const cancelWeightModal =
  document.getElementById("cancelWeightModal");

const toggleWeightFilters =
  document.getElementById("toggleWeightFilters");

const weightFilterOptions =
  document.getElementById("weightFilterOptions");

const dashboardStartWorkout =
  document.getElementById("dashboardStartWorkout");

const dashboardViewWorkout =
  document.getElementById("dashboardViewWorkout");

let dashboardNextWorkoutId = null;
let dashboardNextDestination = "library";

dashboardStartWorkout?.addEventListener("click", () => {
  if (!dashboardNextWorkoutId) return;

  if (typeof startWorkout === "function") {
    startWorkout(dashboardNextWorkoutId);
  }
});

dashboardViewWorkout?.addEventListener("click", () => {
  if (
    dashboardNextWorkoutId &&
    typeof viewActiveWorkoutDetails === "function"
  ) {
    viewActiveWorkoutDetails(dashboardNextWorkoutId);
    return;
  }

  showPage(dashboardNextDestination);
});


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
    if (weightFormMessage) weightFormMessage.textContent = "";
    weightModal.showModal();

    requestAnimationFrame(() => {
      document
        .getElementById("weightModalTitle")
        ?.focus({ preventScroll: true });
    });
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

    const dateAlreadyExists = weights.some(
      entry => entry?.date === date
    );

    if (dateAlreadyExists) {
      if (weightFormMessage) {
        weightFormMessage.textContent =
          "A measurement already exists for this date. Open View Measurements to edit it.";
      }
      return;
    }

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

        localStorage.setItem("spot_weight_graph_filter", String(selectedDays));

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

        toggleWeightFilters.setAttribute(
          "aria-label",
          `Weight graph filter: ${button.textContent.trim()}`
        );

        weightFilterOptions.hidden = true;

        toggleWeightFilters.setAttribute(
          "aria-expanded",
          "false"
        );

          drawWeightChart();
          drawExerciseProgressChart();
        }
    );
  });


// UPDATE WORKOUT SUMMARY
function updateWorkoutSummary() {
  const nextName =
    document.getElementById(
      "nextWorkoutName"
    );

  const progressCount =
    document.getElementById(
      "weeklyProgressCount"
    );

  const progressFill =
    document.getElementById(
      "weeklyProgressFill"
    );

  if (
    !nextName ||
    !progressCount ||
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

    progressCount.textContent = "0/0";

    progressFill.style.width = "0%";
    dashboardNextWorkoutId = null;
    dashboardNextDestination = "library";
    dashboardStartWorkout.hidden = true;

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
    `${completed}/${trainingDays.length}`;

  progressFill.classList.remove("progress-fill-animate");
  progressFill.style.width = "0%";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    progressFill.classList.add("progress-fill-animate");
    progressFill.style.width = `${percentage}%`;
  }));

  if (remainingWorkouts.length > 0) {
    nextName.textContent =
      remainingWorkouts[0].name;

    dashboardNextWorkoutId =
      remainingWorkouts[0].id;

    dashboardNextDestination = "workouts";
    dashboardStartWorkout.hidden = false;
  } else if (trainingDays.length === 0) {
    nextName.textContent =
      "Rest";

    dashboardNextWorkoutId = null;
    dashboardNextDestination = "workouts";
    dashboardStartWorkout.hidden = true;
  } else {
    nextName.textContent =
      "Rest";

    dashboardNextWorkoutId = null;
    dashboardNextDestination = "workouts";
    dashboardStartWorkout.hidden = true;
  }
}


// UPDATE RECENT ACTIVITY
function updateRecentActivity() {
  const workoutDisplay =
    document.getElementById("recentWorkout");

  const weightDisplay =
    document.getElementById("recentWeightChange");

  if (!workoutDisplay || !weightDisplay) return;

  let history = [];

  try {
    history = JSON.parse(
      localStorage.getItem("fitness_workout_history") || "[]"
    );
  } catch {
    history = [];
  }

  const latestWorkout = history
    .filter(session => session?.finishedAt)
    .sort(
      (a, b) =>
        new Date(b.finishedAt) -
        new Date(a.finishedAt)
    )[0];

  if (latestWorkout) {
    const date = new Date(
      latestWorkout.finishedAt
    ).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short"
    });

    workoutDisplay.textContent =
      `${latestWorkout.workoutName} - ${date}`;
  } else {
    workoutDisplay.textContent =
      "No completed workouts yet.";
  }

  const weights = getValidWeights();

  if (weights.length < 2) {
    weightDisplay.textContent =
      "Add two measurements to compare.";
    return;
  }

  const latest = weights[weights.length - 1].weight;
  const previous = weights[weights.length - 2].weight;
  const change = latest - previous;
  const sign = change > 0 ? "+" : "";

  weightDisplay.textContent =
    `${sign}${change.toFixed(1)} kg since last entry`;
}


// UPDATE DASHBOARD
function updateDashboard() {
  updateWorkoutSummary();
  updateRecentActivity();

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
  drawExerciseProgressChart();
}

const progressLineColours = ["#3b82f6", "#557fdc", "#7378c1", "#9272a5", "#ad6d8d", "#c66b72", "#dc7057", "#ec7940", "#f48325", "#ff8c00"];
let savedProgressFilters = {};
try { savedProgressFilters = JSON.parse(localStorage.getItem("spot_progress_graph_filters") || "{}"); } catch {}
const progressHiddenExercises = new Set(Array.isArray(savedProgressFilters.hidden) ? savedProgressFilters.hidden : []);
const normaliseProgressName = value => String(value || "").trim().toLowerCase();

function saveProgressGraphFilters() {
  localStorage.setItem("spot_progress_graph_filters", JSON.stringify({
    metric: document.getElementById("progressMetricFilter")?.value || "weight",
    display: document.getElementById("progressDisplayFilter")?.value || "growth",
    scope: document.getElementById("progressScopeFilter")?.value || "current",
    hidden: [...progressHiddenExercises]
  }));
}

function getStarredExerciseNames() {
  const names = new Map();
  getProgrammes().forEach(programme => (programme.weeks || []).forEach(week =>
    (week.trainingDays || []).forEach(day => (day.exercises || []).forEach(exercise => {
      if (exercise.starred && exercise.name) {
        const label=`${exercise.name} — ${day.name||"Workout"}`;
        names.set(`${programme.id}|${normaliseProgressName(day.name)}|${normaliseProgressName(exercise.name)}`,label);
      }
    }))
  ));
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

function progressValue(exercise, metric) {
  if (metric === "effort") return Number(exercise.effort) || 0;
  const sets = (exercise.sets || []).filter(set => set.completed || (set.weight !== "" && set.reps !== ""));
  return sets.length ? Math.max(...sets.map(set => Number(set[metric]) || 0)) : 0;
}

function refreshProgressExerciseChoices(names) {
  const choices = document.getElementById("progressExerciseChoices");
  if (!choices) return;
  choices.innerHTML = "";
  names.forEach(name => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !progressHiddenExercises.has(normaliseProgressName(name));
    checkbox.addEventListener("change", () => {
      const key = normaliseProgressName(name);
      checkbox.checked ? progressHiddenExercises.delete(key) : progressHiddenExercises.add(key);
      saveProgressGraphFilters();
      drawExerciseProgressChart();
    });
    label.append(checkbox, document.createTextNode(name));
    choices.appendChild(label);
  });
}

function drawExerciseProgressChart() {
  const container = document.getElementById("exerciseProgressChart");
  const legend = document.getElementById("exerciseProgressLegend");
  const metric = document.getElementById("progressMetricFilter")?.value || "weight";
  const requestedDisplay = document.getElementById("progressDisplayFilter")?.value || "growth";
  const display = metric === "effort" ? "actual" : requestedDisplay;
  const scope = document.getElementById("progressScopeFilter")?.value || "current";
  if (!container || !legend) return;
  const names = getStarredExerciseNames();
  refreshProgressExerciseChoices(names);
  const visibleNames = names.filter(name => !progressHiddenExercises.has(normaliseProgressName(name)));
  const title = document.getElementById("exerciseProgressTitle");
  if (title) title.textContent = "Exercise Progress";
  const summary=document.getElementById("exerciseProgressFilterSummary");
  if(summary) summary.textContent=`${metric === "weight" ? "Weight" : metric === "reps" ? "Repetitions" : "Effort"} · ${display === "growth" ? "Growth %" : "Actual Values"} · ${visibleNames.length === names.length ? "All Exercises" : `${visibleNames.length} Selected`}`;
  if (!names.length) { container.innerHTML = '<p class="chart-empty-state">Star an exercise to track it here.</p>'; legend.innerHTML = ""; return; }

  let history = [];
  try { history = JSON.parse(localStorage.getItem("fitness_workout_history") || "[]"); } catch {}
  const activeId = getActiveProgrammeId();
  const sessions = (Array.isArray(history) ? history : [])
    .filter(session => scope === "all" || !activeId || session.programmeId === activeId)
    .filter(session => session.finishedAt)
    .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));
  const series = visibleNames.map((name, colourIndex) => ({
    name, colour: progressLineColours[names.indexOf(name) % progressLineColours.length],
    points: sessions.flatMap(session => {
      const divider=name.lastIndexOf(" — "),exerciseName=divider>=0?name.slice(0,divider):name,workoutName=divider>=0?name.slice(divider+3):"";
      if(workoutName&&normaliseProgressName(session.workoutName)!==normaliseProgressName(workoutName))return[];
      const exercise = (session.exercises || []).find(item => normaliseProgressName(item.name) === normaliseProgressName(exerciseName));
      const value = exercise ? progressValue(exercise, metric) : 0;
      return value > 0 ? [{ value, date: session.finishedAt }] : [];
    })
  }));
  if (display === "growth") {
    series.forEach(item => {
      const baseline=item.points.find(point=>point.value>0)?.value;
      item.points=baseline && item.points.length>1 ? item.points.map(point=>({...point,value:((point.value-baseline)/baseline)*100})) : [];
    });
  }
  const allPoints = series.flatMap(item => item.points);
  if (!allPoints.length) { container.innerHTML = '<p class="chart-empty-state">No recorded results for this view.</p>'; }
  else {
    const width=340,height=220,left=48,right=14,top=14,bottom=38;
    const dates=allPoints.map(p=>new Date(p.date).getTime()), minDate=Math.min(...dates), maxDate=Math.max(...dates);
    const values=allPoints.map(p=>p.value),rawMin=Math.min(...values),rawMax=Math.max(...values);
    const spread=Math.max(rawMax-rawMin,display==="growth"?10:1),padding=spread*.14;
    const minValue=metric==="effort"?1:Math.min(0,rawMin-padding),maxValue=metric==="effort"?5:Math.max(display==="growth"?0:rawMax,rawMax+padding);
    const x=t=>maxDate===minDate?(left+width-right)/2:left+(t-minDate)/(maxDate-minDate)*(width-left-right);
    const y=v=>top+(maxValue-v)/(maxValue-minValue||1)*(height-top-bottom);
    const yTicks=[0,.333,.666,1].map(f=>{const value=minValue+(maxValue-minValue)*f,py=y(value);return `<line class="progress-grid" x1="${left}" y1="${py}" x2="${width-right}" y2="${py}"></line><text text-anchor="end" x="${left-7}" y="${py+4}">${display==="growth"?`${Math.round(value)}%`:metric==="weight"?value.toFixed(maxValue<20?1:0):Math.round(value)}</text>`}).join("");
    const lines=series.map(item=>{if(!item.points.length)return"";const coords=item.points.map(p=>`${x(new Date(p.date).getTime())},${y(p.value)}`).join(" ");const dots=item.points.map((p,index)=>`<circle style="fill:${item.colour}" cx="${x(new Date(p.date).getTime())}" cy="${y(p.value)}" r="${index===item.points.length-1?3.5:2}"></circle>`).join("");return `<polyline style="stroke:${item.colour}" points="${coords}"></polyline>${dots}`}).join("");
    const first=new Date(minDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"}),last=new Date(maxDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    const unit=display==="growth"?"GROWTH %":metric==="weight"?"KG":metric==="effort"?"EFFORT":"REPS";
    const axisCentre=top+(height-top-bottom)/2;
    container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${unit} progress over time"><g>${yTicks}</g><line class="progress-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}"></line><line class="progress-axis" x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}"></line><g class="progress-series">${lines}</g><text class="axis-label" x="${left}" y="${height-9}">${first}</text><text class="axis-label" text-anchor="end" x="${width-right}" y="${height-9}">${last}</text><text class="axis-title" text-anchor="middle" transform="rotate(-90 11 ${axisCentre})" x="11" y="${axisCentre}">${unit}</text></svg>`;
  }
  legend.innerHTML="";
  names.forEach((name,index)=>{const button=document.createElement("button");button.type="button";button.className="progress-legend-item";button.classList.toggle("is-hidden",progressHiddenExercises.has(normaliseProgressName(name)));button.innerHTML=`<span style="background:${progressLineColours[index%progressLineColours.length]}"></span>${name}`;button.onclick=()=>{const key=normaliseProgressName(name);progressHiddenExercises.has(key)?progressHiddenExercises.delete(key):progressHiddenExercises.add(key);saveProgressGraphFilters();drawExerciseProgressChart()};legend.appendChild(button)});
}

document.getElementById("openProgressFilters")?.addEventListener("click",()=>{
  const dialog=document.getElementById("progressFilterDialog");
  document.getElementById("openProgressFilters")?.setAttribute("aria-expanded","true");
  dialog?.showModal();
  dialog?.focus({preventScroll:true});
});
document.getElementById("closeProgressFilters")?.addEventListener("click",()=>document.getElementById("progressFilterDialog")?.close());
document.getElementById("progressFilterDialog")?.addEventListener("close",()=>document.getElementById("openProgressFilters")?.setAttribute("aria-expanded","false"));
["progressMetricFilter","progressDisplayFilter","progressScopeFilter"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>{saveProgressGraphFilters();drawExerciseProgressChart()}));

const progressMetricFilter=document.getElementById("progressMetricFilter");
const progressDisplayFilter=document.getElementById("progressDisplayFilter");
const progressScopeFilter=document.getElementById("progressScopeFilter");
if (["weight","reps","effort"].includes(savedProgressFilters.metric)) progressMetricFilter.value=savedProgressFilters.metric;
if (["growth","actual"].includes(savedProgressFilters.display)) progressDisplayFilter.value=savedProgressFilters.display;
if (["current","all"].includes(savedProgressFilters.scope)) progressScopeFilter.value=savedProgressFilters.scope;

document.querySelectorAll("#weightFilterOptions button").forEach(button => {
  const value = button.dataset.days === "all" ? "all" : Number(button.dataset.days);
  button.classList.toggle("active", value === selectedDays);
});


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

  // Keep an empty graph from taking up a large blank area on phones.
  if (weights.length === 0) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  container.hidden = false;

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

  const path = points.length < 2
    ? points.map(point => `M ${point.x} ${point.y}`).join(" ")
    : points.reduce((result, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = points[index - 1];
        const middleX = (previous.x + point.x) / 2;
        return `${result} Q ${middleX} ${previous.y} ${middleX} ${(previous.y + point.y) / 2} T ${point.x} ${point.y}`;
      }, "");

  let svg = "";

  // GRID LINES
  for (let i = 0; i <= 3; i++) {
    const y =
      top +
      i * (bottom - top) / 3;

    const value =
      maxY -
      i * (maxY - minY) / 3;

    svg += `
      <line
        x1="${left}"
        y1="${y}"
        x2="${right}"
        y2="${y}"
        stroke="#343434"
      />

      <text
        x="3"
        y="${y + 4}"
        fill="#888"
        font-size="10"
      >
        ${value.toFixed(1)}
      </text>
    `;
  }

  // ORANGE GRAPH LINE
  if (points.length > 0) {
    const areaPath = `${path} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
    svg += `
      <defs><linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff8c00" stop-opacity=".25"/><stop offset="100%" stop-color="#ff8c00" stop-opacity="0"/></linearGradient></defs>
      <path d="${areaPath}" fill="url(#weightAreaGradient)" stroke="none" />
      <path
        d="${path}"
        fill="none"
        stroke="#ff8c00"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    `;
  }

  // MEASUREMENT POINTS
  points.forEach((point,index) => {
    const description =
      new Date(point.time)
        .toLocaleString("en-GB");

    svg += `
      <circle
        class="weight-chart-point${index===points.length-1?" is-latest":""}"
        data-index="${index}"
        cx="${point.x}"
        cy="${point.y}"
        r="${index===points.length-1?4:2.25}"
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

  `;

  const changeElement=document.getElementById("weightPeriodChange");
  if(changeElement){
    const change=weights.length>1?weights[weights.length-1].weight-weights[0].weight:0;
    changeElement.textContent=weights.length>1?`${change>=0?"+":""}${change.toFixed(1)} kg over this period`:"Add another measurement to see change";
  }
  container.querySelectorAll(".weight-chart-point").forEach(point=>point.addEventListener("click",()=>{
    container.querySelectorAll(".weight-chart-point").forEach(item=>item.classList.remove("is-selected"));
    point.classList.add("is-selected");
  }));
}

// GET DASHBOARD GOALS
function getDashboardGoals() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "fitness_profile_goals"
      )
    ) || {};
  } catch {
    return {};
  }
}


// FIND THE BEST COMPLETED EXERCISE WEIGHT
function getDashboardBestWeight(exerciseName) {
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
    String(exerciseName || "")
      .trim()
      .toLowerCase();

  let bestWeight = 0;

  history.forEach(session => {
    const exercises =
      Array.isArray(session.exercises)
        ? session.exercises
        : [];

    exercises.forEach(exercise => {
      const sameExercise =
        String(exercise.name || "")
          .trim()
          .toLowerCase() === requestedName;

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


// KEEP A PERCENTAGE BETWEEN 0 AND 100
function limitGoalPercentage(value) {
  if (!Number.isFinite(value)) return 0;

  return Math.min(
    100,
    Math.max(0, value)
  );
}


// CALCULATE BODYWEIGHT GOAL PROGRESS
function getBodyweightGoalProgress(goal) {
  const weights = getValidWeights();

  if (weights.length === 0) return 0;

  const currentWeight =
    weights[weights.length - 1].weight;

  const targetWeight =
    Number(goal.targetWeight);

  let startingWeight =
    Number(goal.startingWeight);

  /*
   * Older bodyweight goals may not have a saved
   * starting weight. Use the earliest measurement.
   */
  if (!Number.isFinite(startingWeight)) {
    startingWeight =
      weights[0].weight;
  }

  if (
    !Number.isFinite(currentWeight) ||
    !Number.isFinite(targetWeight) ||
    !Number.isFinite(startingWeight)
  ) {
    return 0;
  }

  if (startingWeight === targetWeight) {
    return currentWeight === targetWeight
      ? 100
      : 0;
  }

  let progress;

  if (targetWeight < startingWeight) {
    progress =
      (
        (startingWeight - currentWeight) /
        (startingWeight - targetWeight)
      ) * 100;
  } else {
    progress =
      (
        (currentWeight - startingWeight) /
        (targetWeight - startingWeight)
      ) * 100;
  }

  return limitGoalPercentage(progress);
}


// PROTECT TEXT USED INSIDE THE SVG
function escapeRadarText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


// DRAW GOAL RADAR CHART
function drawGoalRadarChart() {
  const container =
    document.getElementById(
      "goalRadarChart"
    );

  if (!container) return;

  const goals = getDashboardGoals();
  const chartGoals = [];

  if (goals.bodyweight) {
    const weights = getValidWeights();

    const currentWeight =
      weights.length > 0
        ? weights[
            weights.length - 1
          ].weight
        : 0;

    chartGoals.push({
      name: "Bodyweight",
      percentage:
        getBodyweightGoalProgress(
          goals.bodyweight
        ),
      details:
        currentWeight > 0
          ? `${currentWeight} / ` +
            `${goals.bodyweight.targetWeight} kg`
          : `Target: ` +
            `${goals.bodyweight.targetWeight} kg`
    });
  }

  const exerciseGoals =
    Array.isArray(goals.exerciseGoals)
      ? goals.exerciseGoals
      : [];

  exerciseGoals.forEach(goal => {
    const bestWeight =
      getDashboardBestWeight(
        goal.exerciseName
      );

    const targetWeight =
      Number(goal.targetWeight);

    const percentage =
      targetWeight > 0
        ? limitGoalPercentage(
            (
              bestWeight /
              targetWeight
            ) * 100
          )
        : 0;

    chartGoals.push({
      name: goal.exerciseName,
      percentage,
      details:
        `${bestWeight} / ` +
        `${targetWeight} kg`
    });
  });

  if (chartGoals.length === 0) {
    container.innerHTML = "";

    return;
  }

  const width = 340;
  const height = 270;
  const centreX = 170;
  const centreY = 135;
  const radius = 95;
  const labelRadius = 125;

  const count = chartGoals.length;

  const pointAt = (
    index,
    distance
  ) => {
    const angle =
      -Math.PI / 2 +
      index * (Math.PI * 2 / count);

    return {
      x:
        centreX +
        Math.cos(angle) * distance,

      y:
        centreY +
        Math.sin(angle) * distance
    };
  };

  let svg = "";

  // CIRCULAR 25%, 50%, 75% AND 100% GUIDES
  [0.25, 0.5, 0.75, 1].forEach(level => {
    svg += `
      <circle
        cx="${centreX}"
        cy="${centreY}"
        r="${radius * level}"
        fill="none"
        stroke="#444"
        stroke-width="1"
      />
    `;
  });

  // AXES AND LABELS
  chartGoals.forEach((goal, index) => {
    const outside =
      pointAt(index, radius);

    const label =
      pointAt(index, labelRadius);

    let textAnchor = "middle";

    if (label.x < centreX - 10) {
      textAnchor = "end";
    }

    if (label.x > centreX + 10) {
      textAnchor = "start";
    }

    const shortName =
      goal.name.length > 16
        ? `${goal.name.slice(0, 14)}...`
        : goal.name;

    svg += `
      <line
        x1="${centreX}"
        y1="${centreY}"
        x2="${outside.x}"
        y2="${outside.y}"
        stroke="#555"
        stroke-width="1"
      />

      <text
        x="${label.x}"
        y="${label.y}"
        text-anchor="${textAnchor}"
        dominant-baseline="middle"
        fill="#ffffff"
        font-size="11"
      >
        ${escapeRadarText(shortName)}
      </text>
    `;
  });

  // PROGRESS SHAPE POINTS
  const progressPoints =
    chartGoals.map((goal, index) => {
      return pointAt(
        index,
        radius *
        (goal.percentage / 100)
      );
    });

  if (progressPoints.length >= 3) {
    const polygonPoints =
      progressPoints
        .map(point =>
          `${point.x},${point.y}`
        )
        .join(" ");

    svg += `
      <polygon
        points="${polygonPoints}"
        fill="rgba(255, 140, 0, 0.28)"
        stroke="#ff8c00"
        stroke-width="3"
        stroke-linejoin="round"
      />
    `;
  } else if (progressPoints.length === 2) {
    svg += `
      <line
        x1="${progressPoints[0].x}"
        y1="${progressPoints[0].y}"
        x2="${progressPoints[1].x}"
        y2="${progressPoints[1].y}"
        stroke="#ff8c00"
        stroke-width="3"
      />
    `;
  }

  // INDIVIDUAL PROGRESS POINTS
  progressPoints.forEach(
    (point, index) => {
      const goal = chartGoals[index];

      svg += `
        <circle
          cx="${point.x}"
          cy="${point.y}"
          r="5"
          fill="#ff8c00"
        >
          <title>
            ${escapeRadarText(goal.name)}:
            ${Math.round(goal.percentage)}%
          </title>
        </circle>
      `;
    }
  );

  const goalSummary =
    chartGoals.map(goal => {
      return `
        <div class="goal-progress-row">
          <span>
            ${escapeRadarText(goal.name)}
          </span>

          <span>
            ${escapeRadarText(goal.details)}
            - ${Math.round(goal.percentage)}%
          </span>
        </div>
      `;
    }).join("");

  container.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      role="img"
      aria-label="Goal progress radar chart"
    >
      ${svg}
    </svg>

    <details class="goal-progress-disclosure">
      <summary aria-label="Show goal details">
        <span class="goal-disclosure-label">Show More</span>
        <span class="disclosure-arrow">⌄</span>
      </summary>

      <div class="goal-progress-content">
        <div class="goal-progress-summary">
          ${goalSummary}
        </div>
      </div>
    </details>
  `;

  const disclosure = container.querySelector(".goal-progress-disclosure");
  disclosure?.addEventListener("toggle", () => {
    const label = disclosure.querySelector(".goal-disclosure-label");
    if (label) label.textContent = disclosure.open ? "Show Less" : "Show More";
  });
}

// INITIALISE DASHBOARD
updateDashboard();
