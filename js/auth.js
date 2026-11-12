(() => {
  const form = document.querySelector("#auth-form");
  document
    .querySelector(".password-toggle")
    ?.addEventListener("click", (event) => {
      const input = document.querySelector("#upass");
      const showing = input.type === "password";
      input.type = showing ? "text" : "password";
      event.currentTarget.textContent = showing ? "Hide" : "Show";
      event.currentTarget.setAttribute("aria-pressed", String(showing));
      event.currentTarget.setAttribute(
        "aria-label",
        showing ? "Hide password" : "Show password",
      );
    });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.getAttribute("aria-busy") === "true") return;
    const error = document.querySelector("#lgrespo");
    const success = document.querySelector("#successd");
    const button = form.querySelector("[type=submit]");
    error.hidden = true;
    success.hidden = false;
    success.textContent = "Signing you in…";
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(form.dataset.endpoint, {
        method: "POST",
        body: new FormData(form),
      });
      if (!response.ok)
        throw new Error("We couldn’t connect. Please try again.");
      const result = (await response.text()).trim();
      const destinations = {
        "correct:farmer": "farmer.php",
        "correct:agron": "agronomist.php",
        success: "portal.php",
      };
      const destination =
        form.dataset.staff === "true"
          ? result === "success"
            ? destinations.success
            : null
          : destinations[result];
      if (!destination)
        throw new Error(
          result.replace(/<[^>]*>/g, "") ||
            "Please check your details and try again.",
        );
      success.textContent = "You’re signed in. Opening your workspace…";
      window.location.assign(destination);
    } catch (failure) {
      success.hidden = true;
      error.textContent = failure.message;
      error.hidden = false;
    } finally {
      button.disabled = false;
      form.setAttribute("aria-busy", "false");
    }
  });
})();
