// FITNESS TRACKER — DATA STORAGE

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
