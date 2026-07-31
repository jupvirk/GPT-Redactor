console.log("PII Redactor Content Script Loaded");

// Define our Regex Patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;// any character, @, any character, ., 2 or more characters, g means global search, so it will find all emails in the prompt
const NAME_REGEX = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;//capital followed by lowercase, space, same again, first last
const PHONE_REGEX = /\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g;
const SSN_REGEX = /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g;

function sanitizeText(rawText) {
  // Replace emails with [EMAIL]
  let cleanText = rawText.replace(EMAIL_REGEX, "[EMAIL]");

  // Replace potential full names with [NAME]
  cleanText = cleanText.replace(NAME_REGEX, "[NAME]");

  // Replace phone numbers with [PHONE]
  cleanText = cleanText.replace(PHONE_REGEX, "[PHONE]");

  // Replace SSNs with [SSN]
  cleanText = cleanText.replace(SSN_REGEX, "[SSN]");

  return cleanText;
}

function handlePromptSubmission() {
  const chatInput = document.querySelector("#prompt-textarea");

  if (chatInput) {
    const userPrompt = chatInput.innerText || chatInput.value; //innerText for div, used by modern webapps, custom element; value for textarea,  a standard HTML text area. An AI could be using either one
    
    if (userPrompt.trim().length > 0) {
      const safePrompt = sanitizeText(userPrompt);

      // 1. Force React to recognize the change via native property setter
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      if (nativeValueSetter && chatInput.tagName === "TEXTAREA") {
        nativeValueSetter.call(chatInput, safePrompt);
      } else {
        chatInput.innerText = safePrompt;
      }

      // 2. Dispatch input event to sync state
      chatInput.dispatchEvent(new Event("input", { bubbles: true }));

      console.log("Original Prompt:", userPrompt);
      console.log("Replaced with Sanitized Prompt:", safePrompt);
    }
  }
}

// 1. Listen for Enter key in CAPTURE phase (3rd argument true)
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    handlePromptSubmission();
  }
}, true); // <-- 'true' intercepts the event BEFORE ChatGPT handles it

// 2. Listen for Send Button click in CAPTURE phase
document.addEventListener("click", function (event) {
  const sendButton = event.target.closest('button[data-testid="send-button"]');
  if (sendButton) {
    handlePromptSubmission();
  }
}, true);
