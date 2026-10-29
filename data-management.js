// SPOT — DATA BACKUP AND RESTORE

const FITNESS_BACKUP_KEYS = [
  "fitness_workout_library",
  "fitness_workout_library_backup_v1",
  "fitness_active_programme",
  "fitness_workout_history",
  "fitnessWeights",
  "fitness_profile_goals",
  "spot_active_workout_session_v1",
  "spot_onboarding_complete_v1"
];

const PRE_RESTORE_BACKUP_KEY =
  "fitness_pre_restore_backup";
const LAST_BACKUP_DATE_KEY = "spot_last_backup_date_v1";

document.getElementById("openDataBackup")?.addEventListener("click",()=>showPage("dataBackup"));
document.getElementById("dataBackupBack")?.addEventListener("click",()=>showPage("profile"));
const lastBackupDate=localStorage.getItem(LAST_BACKUP_DATE_KEY);if(lastBackupDate){const message=document.getElementById("backupMessage");if(message)message.textContent=`Last backup ${new Date(lastBackupDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}.`}


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
      app: "Spot",
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
    link.download = `spot-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());

    const message = document.getElementById("backupMessage");
    if (message) message.textContent = `Backup saved ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}.`;
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
    !["Spot", "Fitness Tracker"].includes(backup.app) ||
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
      if (message) message.textContent = "That is not a valid Spot backup.";
      input.value = "";
      return;
    }

    if (!await showSpotConfirm(
      "Restore this backup?",
      "Your current Spot data will be replaced. A safety copy will be kept on this device.",
      { confirmText: "Restore Backup" }
    )) {
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

    await showSpotMessage(
      "Backup restored",
      "Your Spot data has been restored. The app will now reload."
    );
    location.reload();
  });
