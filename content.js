console.log("Content script loaded on ChatGPT");

// checks for key presses on the entire page
document.addEventListener("keydown", function (event) {
  // checks if user pressed enter
  if (event.key === "Enter") {
    // finds ChatGPT's input box
    const chatInput = document.querySelector("#prompt-textarea");

    if (chatInput) {
      // prints the text typed inside ChatGPT's input area
      console.log("Captured Prompt:", chatInput.innerText || chatInput.value); //innerText for div, used by modern webapps, custom element; value for textarea,  a standard HTML text area. An AI could be using either one
    }
  }
});