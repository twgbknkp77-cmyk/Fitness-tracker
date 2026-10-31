// FITNESS TRACKER â€” DATA STORAGE

const LIBRARY_KEY = "fitness_workout_library";
const LIBRARY_BACKUP_KEY = "fitness_workout_library_backup_v1";
const ACTIVE_KEY = "fitness_active_programme";
const PROGRAMME_SCHEMA_VERSION = 2;
const DEFAULT_PROGRAMME_WEEKS = 8;

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `fitness-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isExerciseStarred(programme, exercise) {
  if (exercise?.starred) return true;
  const wantedId = String(exercise?.id || "");
  const wantedName = String(exercise?.name || "").trim().toLowerCase();
  return (programme?.weeks || []).some(week => (week.trainingDays || []).some(day =>
    (day.exercises || []).some(candidate => Boolean(candidate.starred) && (
      (wantedId && String(candidate.id || "") === wantedId) ||
      String(candidate.name || "").trim().toLowerCase() === wantedName
    ))
  ));
}

function formatSpotTitle(value) {
  return String(value || "").replace(/(^|[\s/()\-])([a-z])/g, (_, boundary, letter) => boundary + letter.toUpperCase());
}

function createProgrammeWeek(number, trainingDays = []) {
  return {
    id: createId(),
    number,
    trainingDays
  };
}

function parseExerciseRepTarget(value, fallback = 10) {
  const raw = String(value ?? fallback)
    .trim()
    .replace(/[–—]/g, "-");
  const match = raw.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

  if (!match) return null;

  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;

  if (!Number.isInteger(min) || min < 1 ||
      !Number.isInteger(max) || max < min) {
    return null;
  }

  return {
    min,
    max,
    value: min === max ? `${min}` : `${min}-${max}`,
    label: min === max ? `${min}` : `${min}–${max}`
  };
}

function getExerciseRepTarget(exercise) {
  return parseExerciseRepTarget(
    exercise?.repsTarget ?? exercise?.reps,
    exercise?.reps ?? 10
  ) || parseExerciseRepTarget(exercise?.reps ?? 10, 10);
}

function formatExercisePrescription(exercise) {
  if (exercise?.type === "cardio") {
    return `${exercise.durationMinutes || 0} min target`;
  }

  return `${exercise?.sets || 0} sets × ` +
    `${getExerciseRepTarget(exercise).label} reps` +
    (exercise?.weight ? ` • ${exercise.weight} kg` : "");
}

let spotDialogResolver = null;

function closeSpotDialog(value) {
  document.getElementById("spotDialog")?.close();
  const resolve = spotDialogResolver;
  spotDialogResolver = null;
  resolve?.(value);
}

function showSpotDialog({
  title,
  message = "",
  confirmText = "OK",
  cancelText = "Cancel",
  danger = false,
  hideCancel = false
}) {
  const dialog = document.getElementById("spotDialog");
  if (!dialog) return Promise.resolve(false);

  document.getElementById("spotDialogTitle").textContent = title;
  document.getElementById("spotDialogMessage").textContent = message;

  const confirmButton = document.getElementById("spotDialogConfirm");
  const cancelButton = document.getElementById("spotDialogCancel");
  confirmButton.textContent = confirmText;
  confirmButton.classList.toggle("danger-button", danger);
  confirmButton.classList.toggle("primary-button", !danger);
  cancelButton.textContent = cancelText;
  cancelButton.hidden = hideCancel;

  if (spotDialogResolver) closeSpotDialog(false);

  return new Promise(resolve => {
    spotDialogResolver = resolve;
    dialog.showModal();
  });
}

function showSpotConfirm(title, message = "", options = {}) {
  return showSpotDialog({ title, message, ...options });
}

function showSpotMessage(title, message = "") {
  return showSpotDialog({
    title,
    message,
    confirmText: "Done",
    hideCancel: true
  });
}

document.getElementById("spotDialogConfirm")?.addEventListener(
  "click",
  () => closeSpotDialog(true)
);

document.getElementById("spotDialogCancel")?.addEventListener(
  "click",
  () => closeSpotDialog(false)
);

document.getElementById("spotDialog")?.addEventListener("cancel", event => {
  event.preventDefault();
  closeSpotDialog(false);
});

// Converts the original flat `days` format into eight weekly blocks.
// Workout and exercise objects are reused, so their IDs continue to match
// completed sessions already stored in fitness_workout_history.
function migrateProgramme(programme) {
  if (!programme || typeof programme !== "object") return null;

  let changed = programme.schemaVersion !== PROGRAMME_SCHEMA_VERSION;
  const requestedWeeks = Number(programme.durationWeeks);
  const durationWeeks = Number.isInteger(requestedWeeks) && requestedWeeks > 0
    ? requestedWeeks
    : DEFAULT_PROGRAMME_WEEKS;

  if (programme.durationWeeks !== durationWeeks) changed = true;

  let weeks = Array.isArray(programme.weeks)
    ? programme.weeks.slice(0, durationWeeks)
    : [];

  if (weeks.length === 0) {
    const existingDays = Array.isArray(programme.days) ? programme.days : [];
    weeks.push(createProgrammeWeek(1, existingDays));
    changed = true;
  }

  weeks = weeks.map((week, index) => {
    if (week && Array.isArray(week.trainingDays)) {
      if (!week.id || week.number !== index + 1) changed = true;
      return {
        ...week,
        id: week.id || createId(),
        number: index + 1
      };
    }

    changed = true;
    return createProgrammeWeek(index + 1);
  });

  while (weeks.length < durationWeeks) {
    weeks.push(createProgrammeWeek(weeks.length + 1));
    changed = true;
  }

  // Starred exercises are programme-wide. If an older programme only stored
  // the star on one week, carry it to matching exercises in every week.
  const starredNames = new Set();
  weeks.forEach(week => (week.trainingDays || []).forEach(day =>
    (day.exercises || []).forEach(exercise => {
      if (exercise.starred) starredNames.add(String(exercise.name || "").trim().toLowerCase());
    })
  ));
  if (starredNames.size) {
    weeks = weeks.map(week => ({
      ...week,
      trainingDays: (week.trainingDays || []).map(day => ({
        ...day,
        exercises: (day.exercises || []).map(exercise => {
          const shouldBeStarred = starredNames.has(String(exercise.name || "").trim().toLowerCase());
          if (shouldBeStarred && !exercise.starred) changed = true;
          return shouldBeStarred ? { ...exercise, starred: true } : exercise;
        })
      }))
    }));
  }

  const requestedCurrentWeek = Number(programme.currentWeek);
  const currentWeek = Number.isInteger(requestedCurrentWeek)
    ? Math.min(Math.max(requestedCurrentWeek, 1), durationWeeks)
    : 1;

  if (currentWeek !== requestedCurrentWeek) changed = true;

  const migrated = {
    ...programme,
    schemaVersion: PROGRAMME_SCHEMA_VERSION,
    durationWeeks,
    currentWeek,
    weeks
  };

  // Temporary compatibility bridge for the existing editor and workout page.
  // It always points them at the current week's freely named training days.
  migrated.days = migrated.weeks[currentWeek - 1].trainingDays;

  return { programme: migrated, changed };
}

function getProgrammes() {
  const rawLibrary = localStorage.getItem(LIBRARY_KEY);
  let stored;

  try {
    stored = JSON.parse(rawLibrary) || [];
  } catch {
    return [];
  }

  if (!Array.isArray(stored)) return [];

  let changed = false;
  const programmes = stored.flatMap(programme => {
    const result = migrateProgramme(programme);
    if (!result) return [];
    changed ||= result.changed;
    return [result.programme];
  });

  if (changed) {
    try {
      if (rawLibrary && !localStorage.getItem(LIBRARY_BACKUP_KEY)) {
        localStorage.setItem(LIBRARY_BACKUP_KEY, rawLibrary);
      }
      saveProgrammes(programmes);
    } catch {
      // Keep using the migrated in-memory data if browser storage is full.
    }
  }
  return programmes;
}

function saveProgrammes(programmes) {
  const normalised = programmes.flatMap(programme => {
    const result = migrateProgramme(programme);
    if (!result) return [];
    return [result.programme];
  });

  localStorage.setItem(LIBRARY_KEY, JSON.stringify(normalised));
}

function getActiveProgrammeId() {
  return localStorage.getItem(ACTIVE_KEY);
}

const FitnessStorage = {
  getWeights() {
    try {
      return JSON.parse(localStorage.getItem("fitnessWeights")) || [];
    } catch {
      return [];
    }
  },

  saveWeights(weights) {
    localStorage.setItem("fitnessWeights", JSON.stringify(weights));
  }
};
