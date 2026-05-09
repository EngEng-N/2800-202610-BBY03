function initAuthForm(formId, endpoint) {
  const form = document.getElementById(formId);
  const message = document.getElementById("auth-message");
  const button = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.removeAttribute("data-ok");

    if (!form.checkValidity()) {
      message.textContent = "Please fill in all fields correctly.";
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        message.textContent = data.error || `Request failed (${res.status}).`;
        return;
      }

      message.textContent = "Success! Redirecting...";
      message.setAttribute("data-ok", "true");
      window.location.href = "./map.html";
    } catch (err) {
      message.textContent = "Network error. Please try again.";
    } finally {
      button.disabled = false;
    }
  });
}
