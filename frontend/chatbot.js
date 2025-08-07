const chatDisplay = document.getElementById("chat-display");
const chatInput = document.getElementById("chat-input");

async function sendChatMessage() {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  chatDisplay.innerHTML += `<div><b>You:</b> ${userMessage}</div>`;
  chatDisplay.innerHTML += `<div id="thinking"><b>SmartBot:</b> <i>Thinking...</i></div>`;
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
  chatInput.value = "";

  try {
    const response = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage })
    });

    const data = await response.json();
    document.getElementById("thinking").innerHTML = `<b>SmartBot:</b> ${data.reply}`;
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

  } catch (error) {
    console.error("Chatbot Error:", error);
    document.getElementById("thinking").innerHTML = `<b>SmartBot:</b> ❌ Error reaching chatbot`;
  }
}
