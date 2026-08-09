console.log("PII Redactor Content Script Loaded");

// Define our Regex Patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;// any character, @, any character, ., 2 or more characters, g means global search, so it will find all emails in the prompt
const NAME_REGEX = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;//capital followed by lowercase, space, same again, first last
const PHONE_REGEX = /\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g;
const SSN_REGEX = /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g;
// Matches capitalized words followed by keywords like High, Middle, Elementary, Academy, School, Institute, etc.
const SCHOOL_REGEX = /\b(?:[A-Z][a-z0-9'-]+\s+)+(?:Elementary(?:\s+School)?|Middle(?:\s+School)?|High(?:\s+School)?|Academy|Institute|School|University|College|Prep(?:aratory)?(?:\s+School)?)\b/gi;
// Matches "I'm", "I am", "im", "Im", "i am", etc., followed by a Name
const INTRO_IM_REGEX = /\b(?:i'?m|i\s+am)\s+([A-Z][a-z]+)\b/gi;
// Matches "my name is", "my name's", "my names", "my name is", etc., followed by a Name
const INTRO_NAME_REGEX = /\bmy\s+names?('?s)?\s+is?\s+([A-Z][a-z]+)\b/gi;
// Matches titles (Mr, Mrs, Ms, Miss, Doctor, etc.) followed by a capitalized Last Name or Full Name
const TEACHER_REGEX = /\b(?:M[rs]s?|Miss|Dr|Doctor|Mister|Madam|Professor)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;

function sanitizeText(rawText) {
  let cleanText = rawText;

  // 1. Redact Emails, Phones, SSNs
  cleanText = cleanText.replace(EMAIL_REGEX, "[REDACTED EMAIL]");
  cleanText = cleanText.replace(PHONE_REGEX, "[REDACTED PHONE]");
  cleanText = cleanText.replace(SSN_REGEX, "[REDACTED SSN]");

  // 2. Redact phrase-based introductions ("I'm Alex", "my name is Sam")
  cleanText = cleanText.replace(INTRO_IM_REGEX, "[REDACTED INTRO]");
  cleanText = cleanText.replace(INTRO_NAME_REGEX, "my name is [REDACTED NAME]");

  // 3. Redact standalone Full Names ("John Smith")
  cleanText = cleanText.replace(NAME_REGEX, "[REDACTED NAME]");

  // 4. Redact School and Teacher Names
  cleanText = cleanText.replace(SCHOOL_REGEX, "[REDACTED SCHOOL]");
  cleanText = cleanText.replace(TEACHER_REGEX, "[REDACTED TEACHER]");

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
