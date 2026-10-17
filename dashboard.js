// FITNESS TRACKER — DASHBOARD

let selectedDays = 30;

const weightForm = document.getElementById("weightForm");
const weightDate = document.getElementById("weightDate");
const weightWheel = document.getElementById("weightWheel");
const weightModal = document.getElementById("weightModal");
const weightMessage = document.getElementById("weightMessage");

const openWeightModal = document.getElementById("openWeightModal");
const cancelWeightModal = document.getElementById("cancelWeightModal");

// TODAY'S DATE
function todayString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateToNumber(date) {
  return new Date(`${date}T12:00:00`).getTime();
}

// CREATE WEIGHT OPTIONS
function populateWeightWheel() {
  const weights = FitnessStorage.getWeights()
    .filter(entry => entry && Number.isFinite(entry.weight))
    .sort((a, b) => a.date.localeCompare(b.date));

  const latestWeight = weights.length
    ? weights[weights.length - 1].weight
    : 87;

  weightWheel.innerHTML = "";

  for (let value = 200; value <= 3000; value++) {
    const weight = (value / 10).toFixed(1);

    const option = document.createElement("option");
    option.value = weight;
    option.textContent = `${weight} kg`;

    weightWheel.appendChild(option);
  }

  weightWheel.value = Math.min(
    300,
    Math.max(20, latestWeight)
  ).toFixed(1);
}

// OPEN POP-UP
openWeightModal.addEventListener("click", function() {
  weightDate.value = todayString();
  weightDate.max = todayString();

  populateWeightWheel();

  weightMessage.textContent = "";
  weightModal.showModal();
});

// CLOSE POP-UP
cancelWeightModal.addEventListener("click", function() {
  weightModal.close();
});

// SAVE WEIGHT
weightForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const date = weightDate.value;
  const weight = Number(weightWheel.value);

  if (
    !date ||
    !Number.isFinite(dateToNumber(date)) ||
    dateToNumber(date) > dateToNumber(todayString()) ||
    !Number.isFinite(weight) ||
    weight < 20 ||
    weight > 300
  ) {
    weightMessage.textContent = "Please enter a valid date and weight.";
    return;
  }

  const weights = FitnessStorage.getWeights();

  const updated = weights.filter(entry => entry.date !== date);

  updated.push({ date, weight });
  updated.sort((a, b) => a.date.localeCompare(b.date));

  try {
    FitnessStorage.saveWeights(updated);

    weightModal.close();
    weightMessage.textContent = "Weight saved successfully!";

    updateDashboard();
  } catch (error) {
    weightMessage.textContent = "Unable to save your measurement.";
  }
});

// TIME FILTER BUTTONS
document.querySelectorAll(".weight-filters button").forEach(button => {
  button.addEventListener("click", function() {
    selectedDays = Number(button.dataset.days);

    document.querySelectorAll(".weight-filters button").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");
    drawWeightChart();
  });
});

// UPDATE LATEST WEIGHT
function updateDashboard() {
  const weights = FitnessStorage.getWeights()
    .filter(entry =>
      entry &&
      typeof entry.date === "string" &&
      Number.isFinite(entry.weight)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const display = document.getElementById("currentWeight");

  if (weights.length > 0) {
    display.textContent =
      `${weights[weights.length - 1].weight.toFixed(1)} kg`;
  } else {
    display.textContent = "-- kg";
  }

  drawWeightChart();
}

// DRAW GRAPH
function drawWeightChart() {
  const container = document.getElementById("weightChart");

  const today = dateToNumber(todayString());
  const start = today - (selectedDays - 1) * 86400000;

  const weights = FitnessStorage.getWeights()
    .filter(entry =>
      entry &&
      typeof entry.date === "string" &&
      Number.isFinite(entry.weight) &&
      dateToNumber(entry.date) >= start &&
      dateToNumber(entry.date) <= today
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const values = weights.map(entry => entry.weight);

  // Use a default graph range when there is no data.
  const minimum = values.length ? Math.min(...values) : 80;
  const maximum = values.length ? Math.max(...values) : 90;

  const padding = Math.max(1, (maximum - minimum) * 0.2);

  const minY = minimum - padding;
  const maxY = maximum + padding;

  const left = 45;
  const right = 310;
  const top = 20;
  const bottom = 155;

  const xPosition = date => {
    const span = Math.max(1, today - start);

    return left +
      ((dateToNumber(date) - start) / span) * (right - left);
  };

  const yPosition = value => {
    return bottom -
      ((value - minY) / (maxY - minY)) * (bottom - top);
  };

  const points = weights.map(entry => ({
    x: xPosition(entry.date),
    y: yPosition(entry.weight),
    date: entry.date,
    weight: entry.weight
  }));

  const path = points.map((point, index) => {
    return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
  }).join(" ");

  let svg = "";

  // GRID LINES
  for (let i = 0; i <= 4; i++) {
    const y = top + i * (bottom - top) / 4;
    const value = maxY - i * (maxY - minY) / 4;

    svg += `
      <line
        x1="${left}" y1="${y}"
        x2="${right}" y2="${y}"
        stroke="#444"
      />
      <text
        x="3" y="${y + 4}"
        fill="#b0b0b0"
        font-size="11"
      >${value.toFixed(1)}</text>
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
    svg += `
      <circle
        cx="${point.x}"
        cy="${point.y}"
        r="5"
        fill="#ff8c00"
      >
        <title>${point.date}: ${point.weight} kg</title>
      </circle>
    `;
  });

  // DATE LABELS
  svg += `
    <text x="${left}" y="180" fill="#b0b0b0" font-size="11">
      Start
    </text>
    <text
      x="${right}" y="180"
      text-anchor="end"
      fill="#b0b0b0"
      font-size="11"
    >
      Today
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
    ${weights.length === 0
      ? '<p style="text-align:center;font-size:13px;">No measurements yet</p>'
      : ''}
  `;
}

// INITIALISE DASHBOARD
updateDashboard();
