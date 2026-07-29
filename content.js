console.log("PII Redactor Content Script Loaded!");

// Define our Regex Patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;// any character, @, any character, ., 2 or more characters, g means global search, so it will find all emails in the prompt
const NAME_REGEX = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;//capital followed by lowercase, space, same again, first last

function sanitizeText(rawText) {
  // 1. Replace emails with [REDACTED EMAIL]
  let cleanText = rawText.replace(EMAIL_REGEX, "[EMAIL]");

  // 2. Replace potential full names with [REDACTED NAME]
  cleanText = cleanText.replace(NAME_REGEX, "[NAME]");

  return cleanText;
}

function handlePromptSubmission() {
  const chatInput = document.querySelector("#prompt-textarea");

  if (chatInput) {
    const userPrompt = chatInput.innerText || chatInput.value; //innerText for div, used by modern webapps, custom element; value for textarea,  a standard HTML text area. An AI could be using either one
      
    // Only log if there is actually text typed
    if (userPrompt.trim().length > 0) {
      const safePrompt = sanitizeText(userPrompt);

      console.log("Original Prompt:", userPrompt);
      console.log("Sanitized Prompt:", safePrompt);
    }
  }
}

// 1. Listen for the "Enter" key press
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    handlePromptSubmission();
  }
});

// 2. Listen for clicks on the Send Arrow Button
document.addEventListener("click", function (event) {
  // Check if the clicked element (or its parent icon) is the send button
  const sendButton = event.target.closest('button[data-testid="send-button"]');

  if (sendButton) {
    handlePromptSubmission();
  }
});

