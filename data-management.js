// FITNESS TRACKER â€” DATA BACKUP AND RESTORE

const FITNESS_BACKUP_KEYS = [
  "fitness_workout_library",
  "fitness_workout_library_backup_v1",
  "fitness_active_programme",
  "fitness_workout_history",
  "fitnessWeights",
  "fitness_profile_goals"
];

const PRE_RESTORE_BACKUP_KEY =
  "fitness_pre_restore_backup";


// COLLECT THE CURRENT APP DATA WITHOUT CHANGING IT
function collectFitnessData() {
  const data = {};

  FITNESS_BACKUP_KEYS.forEach(key => {
    data[key] = localStorage.getItem(key);
  });

  return data;
}


// DOWNLOAD A JSON BACKUP
document
  .getElementById("downloadBackup")
  ?.addEventListener("click", () => {
    const backup = {
      app: "Fitness Tracker",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      data: collectFitnessData()
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `fitness-tracker-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    const message = document.getElementById("backupMessage");
    if (message) message.textContent = "Backup downloaded.";
  });


// OPEN THE FILE PICKER
document
  .getElementById("chooseBackupFile")
  ?.addEventListener("click", () => {
    document.getElementById("backupFileInput")?.click();
  });


// CHECK A BACKUP BEFORE RESTORING IT
function isValidFitnessBackup(backup) {
  if (
    !backup ||
    backup.app !== "Fitness Tracker" ||
    backup.formatVersion !== 1 ||
    !backup.data ||
    typeof backup.data !== "object"
  ) {
    return false;
  }

  return FITNESS_BACKUP_KEYS.some(key =>
    Object.prototype.hasOwnProperty.call(backup.data, key)
  );
}


// RESTORE A SELECTED BACKUP
document
  .getElementById("backupFileInput")
  ?.addEventListener("change", async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const message = document.getElementById("backupMessage");

    if (!file) return;

    let backup;

    try {
      backup = JSON.parse(await file.text());
    } catch {
      if (message) message.textContent = "That file is not valid JSON.";
      input.value = "";
      return;
    }

    if (!isValidFitnessBackup(backup)) {
      if (message) message.textContent = "That is not a valid Fitness Tracker backup.";
      input.value = "";
      return;
    }

    if (!confirm("Restore this backup? Your current app data will be replaced.")) {
      input.value = "";
      return;
    }

    const currentData = collectFitnessData();

    try {
      localStorage.setItem(
        PRE_RESTORE_BACKUP_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          data: currentData
        })
      );

      FITNESS_BACKUP_KEYS.forEach(key => {
        const value = backup.data[key];

        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else if (typeof value === "string") {
          localStorage.setItem(key, value);
        } else {
          throw new Error("Invalid backup value");
        }
      });
    } catch {
      FITNESS_BACKUP_KEYS.forEach(key => {
        const value = currentData[key];

        if (value === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      });

      if (message) {
        message.textContent =
          "The backup could not be restored. Your previous data was retained.";
      }

      input.value = "";
      return;
    }

    alert("Backup restored successfully. The app will now reload.");
    location.reload();
  });
