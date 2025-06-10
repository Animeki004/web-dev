async function sendReply(cardId, name, reply) {
  try {
    const formData = new FormData();
    formData.append("cardId", cardId);
    formData.append("name", name);
    formData.append("reply", reply);

    console.log("Sending reply with data:", {
      cardId,
      name,
      reply,
    });

    // 🔘 Find the submit button
    const sendBtn = document.querySelector(".sendReply");
    const originalText = sendBtn.textContent;
    sendBtn.textContent = "Submitting...";
    sendBtn.disabled = true;

    const res = await fetch(REPLY_SCRIPT_URL, {
      method: "POST",
      body: formData,
    });

    const text = await res.text();
    console.log("Reply submit response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = null;
    }

    if (
      data?.result === "error" &&
      data.message?.toLowerCase().includes("abusive")
    ) {
      swal({
        title: "🚫 Hold It Right There!",
        text: "Trying to sneak in an abusive name?\nThat’s illegal, immoral, and mildly disappointing.",
        icon: "error",
        button: "I'll behave 😓",
      });
      sendBtn.disabled = false;
      sendBtn.textContent = originalText;
      return;
    }

    if (!res.ok || !text.includes("success")) {
      swal("Oops!", "Failed to submit reply. Please try again.", "error");
    }

    // ✅ On success, reset button (but no Swal alert)
    sendBtn.textContent = originalText;
    sendBtn.disabled = false;
  } catch (err) {
    console.error("Network error:", err);
    swal(
      "Network Error",
      "Could not connect to server. Try again later.",
      "error"
    );

    const sendBtn = document.querySelector(".sendReply");
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
  }
}
