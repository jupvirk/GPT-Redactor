console.log("PII Redactor Content Script Loaded!");

// Define our Regex Patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;// any character, @, any character, ., 2 or more characters, g means global search, so it will find all emails in the prompt
const NAME_REGEX = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;//capital followed by lowercase, space, same again, first last

function sanitizeText(rawText) {
  // 1. Replace emails with [REDACTED EMAIL]
  let cleanText = rawText.replace(EMAIL_REGEX, "[REDACTED EMAIL]");

  // 2. Replace potential full names with [REDACTED NAME]
  cleanText = cleanText.replace(NAME_REGEX, "[REDACTED NAME]");

  return cleanText;
}

// Listen for when the user hits Enter in ChatGPT
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    const chatInput = document.querySelector("#prompt-textarea");

    if (chatInput) {
      const userPrompt = chatInput.innerText || chatInput.value; //innerText for div, used by modern webapps, custom element; value for textarea,  a standard HTML text area. An AI could be using either one
      
      
      // Clean the prompt
      const safePrompt = sanitizeText(userPrompt);

      console.log("Original Prompt:", userPrompt);
      console.log("Sanitized Prompt:", safePrompt);
    }
  }
});