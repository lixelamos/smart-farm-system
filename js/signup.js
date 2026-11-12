(() => {
  const form = document.querySelector("#registration-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.getAttribute("aria-busy") === "true") return;
    const button = form.querySelector("button[type=submit]");
    const error = document.querySelector("#registration-error");
    const status = document.querySelector("#registration-success");
    error.hidden = true;
    status.hidden = false;
    status.textContent = "Creating your account…";
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
      });
      if (!response.ok)
        throw new Error("We couldn’t connect. Please try again.");
      const result = (await response.text()).trim();
      if (result !== "success")
        throw new Error(
          result.replace(/<[^>]*>/g, "") ||
            "We couldn’t create your account. Please try again.",
        );
      status.textContent =
        "Account created. Your account needs administrator approval. Taking you to sign in…";
      window.setTimeout(() => window.location.assign("login.php"), 2000);
    } catch (failure) {
      status.hidden = true;
      error.hidden = false;
      error.textContent = failure.message;
      button.disabled = false;
      form.setAttribute("aria-busy", "false");
    }
  });
})();
