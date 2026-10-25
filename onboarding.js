// SPOT — SPLASH SCREEN AND FIRST-USE GUIDE

const SPOT_ONBOARDING_KEY = "spot_onboarding_complete_v1";
const splashScreen = document.getElementById("splashScreen");
const onboardingOverlay = document.getElementById("onboardingOverlay");
const onboardingSlides = Array.from(
  document.querySelectorAll("[data-onboarding-slide]")
);
const onboardingDots = document.getElementById("onboardingDots");
const onboardingBack = document.getElementById("onboardingBack");
const onboardingNext = document.getElementById("onboardingNext");
const skipOnboarding = document.getElementById("skipOnboarding");

let onboardingStep = 0;

function hasCompletedOnboarding() {
  return localStorage.getItem(SPOT_ONBOARDING_KEY) === "true";
}

function renderOnboarding() {
  onboardingSlides.forEach((slide, index) => {
    const active = index === onboardingStep;
    slide.hidden = !active;
    slide.classList.toggle("active", active);
  });

  onboardingDots?.querySelectorAll("span").forEach((dot, index) => {
    dot.classList.toggle("active", index === onboardingStep);
  });

  if (onboardingBack) onboardingBack.hidden = onboardingStep === 0;
  if (onboardingNext) {
    onboardingNext.textContent =
      onboardingStep === onboardingSlides.length - 1
        ? "Get Started"
        : "Next";
  }
}

function openOnboarding() {
  if (!onboardingOverlay) return;
  onboardingStep = 0;
  onboardingOverlay.hidden = false;
  document.body.classList.add("onboarding-open");
  renderOnboarding();
  onboardingNext?.focus();
}

function closeOnboarding() {
  localStorage.setItem(SPOT_ONBOARDING_KEY, "true");
  if (onboardingOverlay) onboardingOverlay.hidden = true;
  document.body.classList.remove("onboarding-open");
}

onboardingSlides.forEach(() => {
  const dot = document.createElement("span");
  onboardingDots?.appendChild(dot);
});

onboardingBack?.addEventListener("click", () => {
  if (onboardingStep === 0) return;
  onboardingStep -= 1;
  renderOnboarding();
});

onboardingNext?.addEventListener("click", () => {
  if (onboardingStep < onboardingSlides.length - 1) {
    onboardingStep += 1;
    renderOnboarding();
    return;
  }

  closeOnboarding();
});

skipOnboarding?.addEventListener("click", closeOnboarding);

document.getElementById("openOnboardingGuide")?.addEventListener(
  "click",
  openOnboarding
);

window.addEventListener("load", () => {
  window.setTimeout(() => {
    splashScreen?.classList.add("is-hiding");

    window.setTimeout(() => {
      splashScreen?.remove();
      if (!hasCompletedOnboarding()) openOnboarding();
    }, 280);
  }, 600);
});
