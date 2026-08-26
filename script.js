"use strict";

// Replace this after deploying the Worker, for example: https://student-email-assistant.YOUR-SUBDOMAIN.workers.dev
const WORKER_URL = "https://student-email-assistant.yukiatsusaka-email-coach.workers.dev/review";
const MAX_LENGTH = 8000;

const form = document.querySelector("#review-form");
const draft = document.querySelector("#email-draft");
const count = document.querySelector("#character-count");
const error = document.querySelector("#form-error");
const status = document.querySelector("#request-status");
const button = document.querySelector("#review-button");
const results = document.querySelector("#results");
const copyButton = document.querySelector("#copy-button");
const copyStatus = document.querySelector("#copy-status");

const feedbackFields = ["clarity", "context", "request_specificity", "professionalism", "concision", "overall_feedback", "revised_email"];
const ratingFields = ["clarity_rating", "context_rating", "request_specificity_rating", "professionalism_rating", "concision_rating"];

function updateCount() { count.textContent = `${draft.value.length.toLocaleString()} / 8,000 characters`; }
function showError(message) { error.textContent = message; error.hidden = false; }
function clearError() { error.textContent = ""; error.hidden = true; }
function setBusy(isBusy) { button.disabled = isBusy; draft.disabled = isBusy; button.textContent = isBusy ? "Reviewing…" : "Review my email"; }
function renderRating(id, rating) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const label = `${rating} out of 5 stars`;
  const element = document.querySelector(`#${id}`);
  element.textContent = `${stars} ${rating}/5`;
  element.setAttribute("aria-label", label);
  element.title = label;
}
function renderReview(review) {
  document.querySelector("#clarity").textContent = review.clarity;
  renderRating("clarity-rating", review.clarity_rating);
  document.querySelector("#context").textContent = review.context;
  renderRating("context-rating", review.context_rating);
  document.querySelector("#request-specificity").textContent = review.request_specificity;
  renderRating("request-specificity-rating", review.request_specificity_rating);
  document.querySelector("#professionalism").textContent = review.professionalism;
  renderRating("professionalism-rating", review.professionalism_rating);
  document.querySelector("#concision").textContent = review.concision;
  renderRating("concision-rating", review.concision_rating);
  document.querySelector("#overall-feedback").textContent = review.overall_feedback;
  document.querySelector("#revised-email").textContent = review.revised_email;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

draft.addEventListener("input", updateCount);
form.addEventListener("submit", async (event) => {
  event.preventDefault(); clearError(); status.textContent = ""; copyStatus.textContent = "";
  const email = draft.value;
  if (!email.trim()) { showError("Paste or write an email draft before requesting feedback."); draft.focus(); return; }
  if (email.length > MAX_LENGTH) { showError("Your draft must be 8,000 characters or fewer."); draft.focus(); return; }
  if (WORKER_URL.includes("REPLACE_WITH_YOUR_WORKER_URL")) { showError("This site has not been connected to its review service yet."); return; }
  setBusy(true); status.textContent = "Reviewing your draft…";
  try {
    const response = await fetch(WORKER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    let payload;
    try { payload = await response.json(); } catch { throw new Error("invalid-response"); }
    if (!response.ok) throw new Error(payload?.error || "request-failed");
    const review = payload?.review;
    if (!review || feedbackFields.some((field) => typeof review[field] !== "string") || ratingFields.some((field) => !Number.isInteger(review[field]) || review[field] < 1 || review[field] > 5)) throw new Error("invalid-response");
    renderReview(review); status.textContent = "Your review is ready.";
  } catch (requestError) {
    const safeMessage = requestError.message === "invalid-response"
      ? "We received an unexpected response. Please try again later."
      : requestError.message === "forbidden-origin"
        ? "This site’s review service needs a configuration update. Please try again later."
        : requestError.message === "rate-limited"
          ? "The review service is busy. Please wait a moment and try again."
          : "We couldn't review your email right now. Please try again later.";
    showError(safeMessage); status.textContent = "";
  } finally { setBusy(false); }
});
copyButton.addEventListener("click", async () => {
  const revised = document.querySelector("#revised-email").textContent;
  try { await navigator.clipboard.writeText(revised); copyStatus.textContent = "Revised email copied."; }
  catch { copyStatus.textContent = "Unable to copy automatically. Select the text and copy it manually."; }
});
updateCount();
