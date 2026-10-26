// FITNESS TRACKER â€” BODYWEIGHT MEASUREMENTS

let editingMeasurementId = null;


// ENSURE OLDER ENTRIES HAVE STABLE IDS AND TIMES
function normaliseMeasurements() {
  const weights = FitnessStorage.getWeights();
  let changed = false;

  const normalised = weights
    .filter(entry =>
      entry &&
      typeof entry.date === "string" &&
      Number.isFinite(Number(entry.weight))
    )
    .map((entry, index) => {
      const updated = {
        ...entry,
        weight: Number(entry.weight)
      };

      if (!updated.id) {
        updated.id = createId();
        changed = true;
      }

      if (!updated.recordedAt) {
        const fallback = new Date(
          `${updated.date}T12:00:00`
        );

        fallback.setMilliseconds(index);
        updated.recordedAt = fallback.toISOString();
        changed = true;
      }

      return updated;
    })
    .sort(
      (a, b) =>
        new Date(a.recordedAt) -
        new Date(b.recordedAt)
    );

  if (changed || normalised.length !== weights.length) {
    FitnessStorage.saveWeights(normalised);
  }

  return normalised;
}


// DISPLAY ALL MEASUREMENTS
function renderMeasurements() {
  const container =
    document.getElementById("measurementsList");

  if (!container) return;

  const weights = normaliseMeasurements()
    .slice()
    .sort(
      (a, b) =>
        new Date(b.recordedAt) -
        new Date(a.recordedAt)
    );

  container.innerHTML = "";

  if (weights.length === 0) {
    container.innerHTML = `
      <div class="card empty-state-card">
        <p>No bodyweight measurements saved yet.</p>
      </div>
    `;
    return;
  }

  weights.forEach(entry => {
    const card = document.createElement("div");
    card.className = "card measurement-card";

    const details = document.createElement("div");

    const weight = document.createElement("h2");
    weight.textContent = `${entry.weight.toFixed(1)} kg`;

    const date = document.createElement("p");
    date.textContent = new Date(`${entry.date}T12:00:00`)
      .toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

    details.append(weight, date);

    const actions = document.createElement("div");
    actions.className = "measurement-actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "measurement-edit-button";
    editButton.addEventListener("click", () => {
      openMeasurementEditor(entry.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "measurement-delete-button";
    deleteButton.addEventListener("click", async () => {
      if (!await showSpotConfirm(
        "Delete this measurement?",
        `${entry.weight.toFixed(1)} kg will be removed from your graph.`,
        { confirmText: "Delete", danger: true }
      )) {
        return;
      }

      const updated = normaliseMeasurements().filter(
        item => item.id !== entry.id
      );

      FitnessStorage.saveWeights(updated);
      renderMeasurements();

      if (typeof updateDashboard === "function") {
        updateDashboard();
      }
    });

    actions.append(editButton, deleteButton);
    card.append(details, actions);
    container.appendChild(card);
  });
}


// OPEN THE EDIT MEASUREMENT POP-UP
function openMeasurementEditor(id) {
  const entry = normaliseMeasurements().find(
    item => item.id === id
  );

  if (!entry) return;

  editingMeasurementId = id;

  document.getElementById("editMeasurementId").value = id;
  document.getElementById("editMeasurementDate").value = entry.date;
  document.getElementById("editMeasurementDate").max = todayString();
  document.getElementById("editMeasurementWeight").value =
    entry.weight.toFixed(1);

  document.getElementById("editMeasurementModal").showModal();
}


// CLOSE THE EDITOR
document
  .getElementById("cancelMeasurementEdit")
  ?.addEventListener("click", () => {
    editingMeasurementId = null;
    document.getElementById("editMeasurementModal").close();
  });


// SAVE AN EDITED MEASUREMENT
document
  .getElementById("editMeasurementForm")
  ?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!editingMeasurementId) return;

    const dateInput =
      document.getElementById("editMeasurementDate");

    const date = dateInput.value;
    dateInput.setCustomValidity("");

    const weight = Number(
      document.getElementById("editMeasurementWeight").value
    );

    if (
      !date ||
      dateToNumber(date) > dateToNumber(todayString()) ||
      !Number.isFinite(weight) ||
      weight < 20 ||
      weight > 300
    ) {
      await showSpotMessage("Check the measurement", "Please enter a valid date and weight.");
      return;
    }

    const weights = normaliseMeasurements();

    const dateAlreadyExists = weights.some(
      item =>
        item.id !== editingMeasurementId &&
        item.date === date
    );

    if (dateAlreadyExists) {
      dateInput.setCustomValidity(
        "A measurement already exists for this date."
      );
      dateInput.reportValidity();
      return;
    }

    const entry = weights.find(
      item => item.id === editingMeasurementId
    );

    if (!entry) return;

    const existingTime = new Date(entry.recordedAt);
    const hours = String(existingTime.getHours()).padStart(2, "0");
    const minutes = String(existingTime.getMinutes()).padStart(2, "0");
    const seconds = String(existingTime.getSeconds()).padStart(2, "0");

    entry.date = date;
    entry.weight = weight;
    entry.recordedAt = new Date(
      `${date}T${hours}:${minutes}:${seconds}`
    ).toISOString();

    FitnessStorage.saveWeights(weights);

    editingMeasurementId = null;
    document.getElementById("editMeasurementModal").close();

    renderMeasurements();

    if (typeof updateDashboard === "function") {
      updateDashboard();
    }
  });
