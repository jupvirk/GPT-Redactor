# 🛡️ GPT-Redactor

> **Client-Side PII Tokenization & Privacy Vault for ChatGPT**  
> Protect your sensitive personal data before it ever hits OpenAI servers.

---

## 📌 Overview

**GPT-Redactor** is a high-performance, client-side Chrome Extension (Manifest V3) designed to prevent accidental leakage of Personally Identifiable Information (PII) when using [ChatGPT](https://chatgpt.com). 

Unlike server-side proxy redactors or VPN solutions, **GPT-Redactor operates entirely in your local browser runtime**. It intercepts prompt submissions in the DOM capture phase, extracts and stores sensitive PII in a secure in-memory browser vault, and transmits only anonymized synthetic tokens (e.g., `{{EMAIL_1}}`, `{{PHONE_1}}`, `{{NAME_1}}`) over the network. 

When ChatGPT streams its response, a live DOM observer seamlessly restores the tokens back to their original values on your screen in real time. **To OpenAI, your prompt was completely anonymized; to you, the chat remains natural and fluent.**

```
+-----------------------------------------------------------------------------------------+
|                                  LOCAL BROWSER RUNTIME                                  |
|                                                                                         |
|   [ User Types Prompt ]                                                                 |
|   "Contact Alice at alice@example.com"                                                  |
|             │                                                                           |
|             ▼ (Capture-Phase Interception)                                              |
|   [ Tokenizer & Local Vault ] ──────────────► Local Memory Vault (never leaves browser) |
|   Replaced with:                               { '{{NAME_1}}': 'Alice',                 |
|   "Contact {{NAME_1}} at {{EMAIL_1}}"            '{{EMAIL_1}}': 'alice@example.com' }   |
|             │                                                    │                      |
|             ▼ (React State Sync)                                 │                      |
|   [ Network Request to OpenAI ]                                  │                      |
|             │                                                    │                      |
+─────────────┼────────────────────────────────────────────────────┼──────────────────────+
              │                                                    │
              ▼ (Over the Wire)                                    │
    [ ChatGPT LLM Process ]                                        │
    "I will email {{NAME_1}} at {{EMAIL_1}}..."                   │
              │                                                    │
+─────────────┼────────────────────────────────────────────────────┼──────────────────────+
              ▼                                                    │
|   [ Response Stream Arrives ]                                    │                      |
|             │                                                    │                      |
|             ▼                                                    │                      |
|   [ MutationObserver Restorer ] ◄────────────────────────────────┘                      |
|             │                                                                           |
|             ▼                                                                           |
|   [ Rendered on User UI ]                                                               |
|   "I will email Alice at alice@example.com..."                                          |
+-----------------------------------------------------------------------------------------+
```

---

## ✨ Features

- **🔒 Zero-Knowledge Privacy Architecture**  
  PII is never written to disk, sent to external analytics, or transmitted over any network socket. The vault resides strictly in volatile browser memory.
- **⚡ Capture-Phase Event Interception**  
  Listens for `Enter` keystrokes and pointer/mouse clicks (`pointerdown`, `mousedown`, `click`) during the event capture phase to intercept input before ChatGPT's React event handlers can process it.
- **🔄 React State Synchronization**  
  Uses DOM command dispatching (`execCommand('insertText')`) and synthetic `input`/`change` event cascades to ensure ChatGPT's internal React virtual DOM state remains perfectly in sync without triggering infinite re-render loops.
- **🎯 Intelligent PII Detection Suite**  
  Detects and tokenizes multiple categories of sensitive data using battle-tested pattern matching:
  - **Emails**: Standard and international email addresses.
  - **Phone Numbers**: US formats with optional country code, delimiters, and parentheses.
  - **Social Security Numbers (SSN)**: Validated against standard 9-digit patterns with area/group rule checks.
  - **Educational Institutions**: Schools, Academies, Middle/High Schools, Universities, and Colleges.
  - **Educators & Honorifics**: Titles (Mr., Mrs., Ms., Dr., Prof.) paired with full or family names.
  - **Conversational Introductions**: Context-aware phrase matching (e.g., *"I'm John"*, *"My name is Sarah"*).
  - **Standalone Names**: Capitalized proper full names.
- **👁️ Seamless UI Restoration**  
  A lightweight `MutationObserver` continuously scans incoming text nodes inside chat response bubbles to transparently map tokens back to original values, while purposefully ignoring active typing areas to prevent accidental prompt leaks.

---

## 🛠️ Project Structure

```
GPT-Redactor/
├── manifest.json      # Chrome Extension Manifest V3 configuration
├── content.js         # Core tokenization engine, React synchronizer & UI restorer
└── README.md          # Project documentation
```

---

## 🚀 Installation & Usage

### 1. Load Extension in Chrome

1. Clone or download this repository:
   ```bash
   git clone https://github.com/jupvirk/GPT-Redactor.git
   ```
2. Open Google Chrome (or any Chromium-based browser like Brave, Edge, or Arc).
3. Navigate to `chrome://extensions/` in your address bar.
4. Enable **Developer mode** using the toggle in the top-right corner.
5. Click **Load unpacked** in the top-left corner.
6. Select the `GPT-Redactor` root folder (containing `manifest.json`).

### 2. Verify on ChatGPT

1. Navigate to [https://chatgpt.com](https://chatgpt.com).
2. Open Chrome Developer Tools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`) and go to the **Console** tab.
3. You should see:
   ```
   PII Redactor Content Script Loaded
   ```
4. Type a prompt containing sensitive data into ChatGPT, for example:
   > *"Hello, my name is John Doe and my email is john.doe@example.com. Please write a bio for Dr. Smith at Lincoln High School."*
5. Press **Enter** or click **Send**.
6. Check your browser console:
   - You will see the original text intercepted, the tokenized text, and the current `piiVault` state.
   - ChatGPT receives only `{{INTRO_1}}`, `{{EMAIL_1}}`, `{{TEACHER_1}}`, and `{{SCHOOL_1}}`.
   - The rendered chat bubbles on your screen will seamlessly show the original names and identifiers.

---

## 🔍 How It Works Under the Hood

### 1. Tokenization (`tokenizePII`)
Matches raw user text against regex definitions in strict priority order (structured PII first, then contextual introductions, then generic names). Each unique match receives a numbered placeholder (e.g., `{{EMAIL_1}}`), and repeated occurrences reuse existing tokens.

### 2. State Injection (`updateReactInput`)
Modern React controls input via internal fiber state. Simply modifying `element.value` does not update the underlying state. `updateReactInput` focuses the target element, utilizes `document.execCommand('selectAll')` and `insertText`, and dispatches bubbling `input` and `change` events.

### 3. Simulation Safeguards (`isSimulating`)
To re-trigger submission after tokenization without entering an infinite interception loop, an `isSimulating` flag locks the capture listener during the synthetic submit event before clearing shortly afterward.

### 4. DOM Tree Walking (`MutationObserver`)
When ChatGPT renders response tokens into the DOM, the observer traverses child nodes using `NodeFilter.SHOW_TEXT` and replaces matching tokens using stored vault references.

---

## 🛡️ Security & Privacy Principles

- **No Remote Servers**: GPT-Redactor does not communicate with any third-party server or API.
- **Volatile Storage**: The token vault resides strictly in browser RAM and is reset when the page is reloaded.
- **Zero Disk Persistence**: Sensitive values are never persisted to `localStorage`, `indexedDB`, or browser cookies.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues tab or submit a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
