(() => {
  const dialog = document.querySelector(".caption");
  const attachment = document.querySelector("label[for=pic]");
  attachment?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      document.querySelector("#pic").click();
    }
  });
  const modal = new MutationObserver(() => {
    if (getComputedStyle(dialog).display !== "none" && !dialog.dataset.open) {
      dialog.dataset.open = "true";
      document.querySelector("#photo-caption").focus();
    } else if (
      getComputedStyle(dialog).display === "none" &&
      dialog.dataset.open
    ) {
      delete dialog.dataset.open;
      attachment?.focus();
    }
  });
  if (dialog)
    modal.observe(dialog, { attributes: true, attributeFilter: ["style"] });
  document.addEventListener("keydown", (event) => {
    if (!dialog?.dataset.open) return;
    if (event.key === "Escape") {
      window.closeprog();
      return;
    }
    if (event.key === "Tab") {
      const elements = [...dialog.querySelectorAll("textarea,button")].filter(
        (e) => e.offsetParent !== null,
      );
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault();
        elements.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === elements.at(-1)
      ) {
        event.preventDefault();
        elements[0]?.focus();
      }
    }
  });
})();
