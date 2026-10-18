// FITNESS TRACKER — DATA STORAGE

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

function createProgrammeWeek(number, trainingDays = []) {
  return {
    id: createId(),
    number,
    trainingDays
  };
}

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

    const currentIndex = result.programme.currentWeek - 1;
    if (Array.isArray(programme.days)) {
      result.programme.weeks[currentIndex].trainingDays = programme.days;
      result.programme.days = programme.days;
    }

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
