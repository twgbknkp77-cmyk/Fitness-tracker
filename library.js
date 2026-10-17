// FITNESS TRACKER — WORKOUT LIBRARY

const LIBRARY_KEY = "fitness_workout_library";
const ACTIVE_KEY = "fitness_active_programme";

// GET SAVED PROGRAMMES
function getProgrammes() {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY)) || [];
  } catch {
    return [];
  }
}

// SAVE PROGRAMMES
function saveProgrammes(programmes) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(programmes));
}

// GET ACTIVE PROGRAMME
function getActiveProgrammeId() {
  return localStorage.getItem(ACTIVE_KEY);
}

// CREATE PROGRAMME
function createProgramme() {
  const name = prompt("Enter your programme name:");

  if (!name || !name.trim()) return;

  const programmes = getProgrammes();

  const programme = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    days: []
  };

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
function renderLibrary() {
  const container = document.getElementById("programmeLibrary");

  if (!container) return;

  const programmes = getProgrammes();
  const activeId = getActiveProgrammeId();

  container.innerHTML = "";

  if (programmes.length === 0) {
    container.innerHTML = "<p>No programmes saved yet.</p>";
    return;
  }

  programmes.forEach(programme => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = programme.name;

    const status = document.createElement("p");
    status.textContent =
      programme.id === activeId ? "🟠 Active Programme" : "Saved Programme";

    const activateButton = document.createElement("button");
    activateButton.textContent =
      programme.id === activeId ? "Active" : "Activate";
    activateButton.disabled = programme.id === activeId;
    activateButton.addEventListener("click", () => {
      activateProgramme(programme.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteProgramme(programme.id);
    });

    card.append(title, status, activateButton, deleteButton);
    container.appendChild(card);
  });
}

// DISPLAY ACTIVE PROGRAMME ON WORKOUTS PAGE
function renderActiveWorkout() {
  const container = document.getElementById("activeWorkout");

  if (!container) return;

  const programmes = getProgrammes();
  const activeId = getActiveProgrammeId();

  const activeProgramme = programmes.find(
    programme => programme.id === activeId
  );

  if (!activeProgramme) {
    container.textContent = "No active programme. Activate one in your Library.";
    return;
  }

  container.textContent = `Active Programme: ${activeProgramme.name}`;
}

// CONNECT CREATE BUTTON
document.getElementById("createProgramme")
  ?.addEventListener("click", createProgramme);

// INITIALISE
renderLibrary();
renderActiveWorkout();
