// FITNESS TRACKER — DASHBOARD

let selectedDays = 30;

const weightForm = document.getElementById("weightForm");
const weightDate = document.getElementById("weightDate");
const weightInput = document.getElementById("weightInput");
const weightMessage = document.getElementById("weightMessage");

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

// Set today's date automatically.
weightDate.value = todayString();
weightDate.max = todayString();

// Save a weight measurement.
weightForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const date = weightDate.value;
  const weight = Number(weightInput.value);

  if (
    !date ||
    !Number.isFinite(weight) ||
    weight < 20 ||
    weight > 500 ||
    dateToNumber(date) > dateToNumber(todayString())
  ) {
    weightMessage.textContent = "Please enter a valid date and weight.";
    return;
  }

  const weights = FitnessStorage.getWeights();

  // Replace an existing measurement for the same date.
  const updated = weights.filter(entry => entry.date !== date);

  updated.push({ date, weight });
  updated.sort((a, b) => a.date.localeCompare(b.date));

  try {
    FitnessStorage.saveWeights(updated);
    weightMessage.textContent = "Weight saved successfully!";
    weightInput.value = "";
    updateDashboard();
  } catch (error) {
    weightMessage.textContent = "Unable to save your measurement.";
  }
});

// Graph time filters.
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
    const latest = weights[weights.length - 1];
    display.textContent = `${latest.weight.toFixed(1)} kg`;
  } else {
    display.textContent = "-- kg";
  }

  drawWeightChart();
}

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

  if (weights.length === 0) {
    container.innerHTML =
      "<p>No weight measurements for this period yet.</p>";
    return;
  }

  const values = weights.map(entry => entry.weight);

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max(1, (maximum - minimum) * 0.2);

  const minY = minimum - padding;
  const maxY = maximum + padding;

  const left = 45;
  const right = 310;
  const top = 20;
  const bottom = 155;

  const xPosition = date => {
    const span = Math.max(1, today - start);
    return left + ((dateToNumber(date) - start) / span) * (right - left);
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

  // Horizontal grid lines and weight labels.
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

  // Orange trend line.
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

  // Individual measurements.
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

  svg += `
    <text x="${left}" y="180" fill="#b0b0b0" font-size="11">
      Start
    </text>
    <text x="${right}" y="180"
      text-anchor="end"
      fill="#b0b0b0"
      font-size="11">
      Today
    </text>
  `;

  container.innerHTML = `
    <svg
      viewBox="0 0 320 190"
      style="width:100%;height:auto;display:block;"
      role="img"
      aria-label="Bodyweight trend over the selected period"
    >
      ${svg}
    </svg>
  `;
}

// Display saved measurements when the app opens.
updateDashboard();
