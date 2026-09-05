console.log("PII Redactor Content Script Loaded");


// Local memory vault (resides ONLY in the user's browser)
let piiVault = {};
let tokenCounter = 0;
let isHunting = true;
// Define our Regex Patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;// any character, @, any character, ., 2 or more characters, g means global search, so it will find all emails in the prompt
const NAME_REGEX = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;//capital followed by lowercase, space, same again, first last
const PHONE_REGEX = /\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g;
const SSN_REGEX = /\b(?!000|666|9\d{2})\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}\b/g;
// Matches capitalized words followed by keywords like High, Middle, Elementary, Academy, School, Institute, etc.
// Matches strictly 1 or 2 capitalized words followed by a school suffix keyword
const SCHOOL_REGEX = /\b([A-Z][a-z0-9'-]+(?:\s+[A-Z][a-z0-9'-]+)?)\s+(?:Elementary(?:\s+School)?|Middle(?:\s+School)?|High(?:\s+School)?|Academy|Institute|School|University|College|Prep(?:aratory)?(?:\s+School)?)\b/g;
// Matches "I'm", "I am", "im", "Im", "i am", etc., followed by a Name
const INTRO_IM_REGEX = /\b(?:i'?m|i\s+am)\s+([A-Z][a-z]+)\b/gi;
// Matches "my name is", "my name's", "my names", "my name is", etc., followed by a Name
const INTRO_NAME_REGEX = /\bmy\s+names?('?s)?\s+is?\s+([A-Z][a-z]+)\b/gi;
// Matches titles (Mr, Mrs, Ms, Miss, Doctor, etc.) followed by a capitalized Last Name or Full Name
const TEACHER_REGEX = /\b(?:M[rs]s?|Miss|Dr|Doctor|Mister|Madam|Professor)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;

function tokenizePII(rawText) {
  let cleanText = rawText;

  // Helper function to tokenize matches for a specific regex and label
 function replaceWithToken(text, regex, typeLabel) {
  return text.replace(regex, (match) => {
    // Check if we already tokenized this exact piece of text
    const existingToken = Object.keys(piiVault).find(
      (key) => piiVault[key] === match
    );

    if (existingToken) {
      return existingToken; // Reuse existing token
    }

    // Otherwise, create a new token
    tokenCounter++;
    const token = `{{${typeLabel}_${tokenCounter}}}`;
    piiVault[token] = match;
    return token;
  });
}

  // 1. Structured PII
  cleanText = replaceWithToken(cleanText, EMAIL_REGEX, "EMAIL");
  cleanText = replaceWithToken(cleanText, PHONE_REGEX, "PHONE");
  cleanText = replaceWithToken(cleanText, SSN_REGEX, "SSN");

  // 2. Schools & Teachers
  cleanText = replaceWithToken(cleanText, SCHOOL_REGEX, "SCHOOL");
  cleanText = replaceWithToken(cleanText, TEACHER_REGEX, "TEACHER");

  // 3. Phrase-Based Introductions
  cleanText = replaceWithToken(cleanText, INTRO_IM_REGEX, "INTRO");
  cleanText = replaceWithToken(cleanText, INTRO_NAME_REGEX, "INTRO_NAME");

  // 4. Standalone Names
  cleanText = replaceWithToken(cleanText, NAME_REGEX, "NAME");

  console.log("Vault state right now:", piiVault);
  return cleanText;
}

// ==========================================
// 1. REACT STATE UPDATER & SMART LOCATOR
// ==========================================
function updateReactInput(element, newText) {
  element.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, newText);
  element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

function getActiveInputBox(event) {
  // If the user hit Enter, the target is exactly the box they are typing in
  if (event && event.type === 'keydown' && event.target) {
    return event.target;
  }

  // If they clicked Send, find the active editable box
  const potentialBoxes = document.querySelectorAll('textarea, rich-textarea div[contenteditable="true"], [contenteditable="true"]');
  for (let box of potentialBoxes) {
    if (box.closest('user-message') || box.hasAttribute('readonly')) continue;
    const text = box.value || box.innerText || box.textContent || "";
    if (text.trim().length > 0) return box;
  }
  return null;
}

// ==========================================
// 2. CORE INTERCEPTION LOGIC
// ==========================================
let isSimulating = false; // Prevents infinite loops

function handleInterception(event, isClickAction, targetBtn = null) {
  const inputBox = getActiveInputBox(event);
  if (!inputBox) return; // Abort if no valid box is found

  const originalText = inputBox.value || inputBox.innerText || inputBox.textContent || "";
  if (!originalText.trim()) return;

  // Run your existing regex tokenization here
  const cleanText = tokenizePII(originalText);

  // If PII was found and redacted
  if (cleanText !== originalText) {
    // Stop ChatGPT from reading the unredacted text
    event.preventDefault();
    event.stopImmediatePropagation();

    console.log("Original Prompt:", originalText);
    console.log("Replaced with Tokenized Prompt:", cleanText);
    console.log("PII Vault:", piiVault);

    // Turn on the UI Restorer
    isHunting = true;

    // Force React to accept the tokenized text
    updateReactInput(inputBox, cleanText);

    // Re-trigger the submission slightly after state updates
    setTimeout(() => {
      isSimulating = true;

      if (isClickAction && targetBtn) {
        targetBtn.click();
      } else {
        // Dispatch synthetic Enter specifically to the active box
        inputBox.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true
        }));
      }

      // Unlock simulation after a tiny buffer
      setTimeout(() => { isSimulating = false; }, 200);
    }, 0); // Kept at 0ms to prevent visual flash
  }
}
/*
function handlePromptSubmission() {
  const chatInput = document.querySelector("#prompt-textarea");

  if (chatInput) {
    const userPrompt = chatInput.innerText || chatInput.value; //innerText for div, used by modern webapps, custom element; value for textarea,  a standard HTML text area. An AI could be using either one
    
    if (userPrompt.trim().length > 0) {
      const safePrompt = tokenizePII(userPrompt);

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
      console.log("Replaced with Tokenized Prompt:", safePrompt);
      console.log("PII Vault:", piiVault);
    }
  }
}


// 1. Listen for Enter key in CAPTURE phase (3rd argument true)
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    event.stopImmediatePropagation();
    handlePromptSubmission();
    // Trigger submission programmatically after updating state
    setTimeout(() => {
      const sendButton = document.querySelector('button[data-testid="send-button"]');
      if (sendButton) sendButton.click();
    }, 50);
  }
}, true); // <-- 'true' intercepts the event BEFORE ChatGPT handles it

// 2. Listen for Send Button click in CAPTURE phase
let isProgrammaticClick = false;

document.addEventListener("click", function(event) {
  const sendButton = event.target.closest('button[data-testid="send-button"]');
  
  if (sendButton) {
    // If this click was triggered by our setTimeout, let ChatGPT handle it normally
    if (isProgrammaticClick) {
      isProgrammaticClick = false;
      return; 
    }

    // Stop ChatGPT from reading the unredacted text on the initial click
    event.preventDefault();
    event.stopImmediatePropagation();

    // Run your existing submission/tokenizing function
    handlePromptSubmission();

    // Re-trigger the click now that React and the text box have clean text
    setTimeout(() => {
      isProgrammaticClick = true;
      sendButton.click();
    }, 50);
  }
}, true); // Capture phase
*/

// Watch ChatGPT's response container for new incoming text
// ==========================================
// SEAMLESS UI RESTORER (Integrated)
// ==========================================


const uiObserver = new MutationObserver((mutations) => {
  // If there are no replacements saved in the vault, do nothing
  if (!isHunting || Object.keys(piiVault).length === 0) return;

  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // CRITICAL: Skip the active typing area so text stays redacted while typing/sending!
          if (
            node.closest('rich-textarea') || 
            node.closest('[role="textbox"]') || 
            node.closest('textarea')
          ) {
            return;
          }

          // Walk through all text nodes inside newly added response bubbles
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
          let textNode;

          while ((textNode = walker.nextNode())) {
            let nodeText = textNode.nodeValue;
            let nodeChanged = false;

            // Loop through stored tokens in your vault and swap them back on screen
            for (const [token, originalValue] of Object.entries(piiVault)) {
              // Escape special regex characters in the token (e.g. {{NAME_1}})
              const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              
              if (regex.test(nodeText)) {
                nodeText = nodeText.replace(regex, originalValue);
                nodeChanged = true;
              }
            }

            // Update the screen text seamlessly
            if (nodeChanged) {
              textNode.nodeValue = nodeText;
            }
          }
        }
      });
    }
  });
});

// Start watching the DOM
uiObserver.observe(document.body, { childList: true, subtree: true });

// ==========================================
// 3. CAPTURE PHASE LISTENERS
// ==========================================

// Intercept Enter Key
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !isSimulating) {
    handleInterception(event, false);
  }
}, true); // Capture phase

// Intercept Mouse Clicks (including early mouse-down events)
function handleMouseInterception(event) {
  if (isSimulating) return;

  const targetBtn = event.target.closest('button, [role="button"]');
  if (targetBtn) {
    // Check if the button looks like a send button
    const btnData = targetBtn.outerHTML.toLowerCase() +
                    (targetBtn.getAttribute('aria-label') || '').toLowerCase() +
                    (targetBtn.getAttribute('data-tooltip') || '').toLowerCase();

    if (btnData.includes('send')) {
      handleInterception(event, true, targetBtn);
    }
  }
}

// Bind to all phases of a click to beat React to the punch
document.addEventListener("pointerdown", handleMouseInterception, true);
document.addEventListener("mousedown", handleMouseInterception, true);
document.addEventListener("click", handleMouseInterception, true);