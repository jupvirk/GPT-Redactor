console.log("Content script loaded on ChatGPT!");

// Listen for key presses on the entire page
document.addEventListener("keydown", function (event) {
  // Check if the user pressed Enter
  if (event.key === "Enter") {
    // Find ChatGPT's input box
    const chatInput = document.querySelector("#prompt-textarea");

    if (chatInput) {
      // Print the text typed inside ChatGPT's input area
      console.log("Captured Prompt:", chatInput.innerText || chatInput.value);
    }
  }
});