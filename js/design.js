(() => {
  const toggle = document.querySelector(".menu-toggle");
  const scrim = document.querySelector(".menu-scrim");
  const menu = document.querySelector(".app-sidebar");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    toggle?.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
    if (scrim) scrim.hidden = !open;
    if (open) menu?.querySelector(".workspace-link")?.focus();
  };
  toggle?.addEventListener("click", () =>
    setMenu(!document.body.classList.contains("menu-open")),
  );
  scrim?.addEventListener("click", () => {
    setMenu(false);
    toggle?.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      document.body.classList.contains("menu-open")
    ) {
      setMenu(false);
      toggle?.focus();
    }
    if (event.key === "Tab" && document.body.classList.contains("menu-open")) {
      const focusable = [...menu.querySelectorAll("a,button")];
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === focusable.at(-1)
      ) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    }
  });
  document.querySelectorAll(".workspace-link").forEach((link) =>
    link.addEventListener("click", () => {
      document.querySelectorAll(".workspace-link").forEach((item) => {
        item.classList.remove("is-active");
        item.removeAttribute("aria-current");
      });
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
      const title = document.querySelector("#page-name");
      if (title) title.textContent = link.querySelector("span").textContent;
      setMenu(false);
    }),
  );
  document
    .querySelector(".workspace-link.is-active")
    ?.setAttribute("aria-current", "page");
  const activity = document.querySelector(".mainactivity");
  let idCounter = 0;
  function enhanceContent() {
    activity?.querySelectorAll("table").forEach((table) => {
      if (!table.rows.length && !table.hidden) {
        table.hidden = true;
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No records yet. New activity will appear here.";
        table.after(empty);
        return;
      }
      if (table.hidden) return;
      if (
        table.closest("form") ||
        table.parentElement.classList.contains("table-scroll")
      )
        return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-scroll";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Scrollable records");
      table.before(wrapper);
      wrapper.append(table);
    });
    activity
      ?.querySelectorAll('tr[style*="font-weight:bold"] > td')
      .forEach((cell) => {
        const heading = document.createElement("th");
        for (const attribute of cell.attributes)
          heading.setAttribute(attribute.name, attribute.value);
        heading.scope = "col";
        heading.append(...cell.childNodes);
        cell.replaceWith(heading);
      });
    activity?.querySelectorAll("img").forEach((image) => {
      if (!image.hasAttribute("alt"))
        image.alt =
          image.closest("tr,.udiv")?.querySelector("h4")?.textContent.trim() ||
          "";
      image.decoding = "async";
    });
    activity?.querySelectorAll("p").forEach((paragraph) => {
      if (
        /^No (?:Farm|News|products|requests|records|inputs|payments|produce|sales|agronomists|farmers|Chats)/i.test(
          paragraph.textContent.trim(),
        ) &&
        paragraph.childElementCount === 0
      )
        paragraph.classList.add("empty-state");
    });
    activity
      ?.querySelectorAll("input:not([type=hidden]),select,textarea")
      .forEach((input) => {
        if (input.labels?.length || input.hasAttribute("aria-label")) return;
        const text = input.parentElement.textContent
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 80);
        input.setAttribute(
          "aria-label",
          text || input.placeholder || input.name || "Form field",
        );
        if (!input.id) input.id = `workspace-field-${++idCounter}`;
      });
    activity
      ?.querySelectorAll(
        "[onclick]:not(button):not(a):not(input):not(select):not(option)",
      )
      .forEach((control) => {
        if (control.hasAttribute("data-keyboard")) return;
        control.dataset.keyboard = "true";
        control.tabIndex = 0;
        control.setAttribute("role", "button");
        control.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            control.click();
          }
        });
      });
  }
  if (activity) {
    const observer = new MutationObserver(() => {
      observer.disconnect();
      enhanceContent();
      observer.observe(activity, { childList: true, subtree: true });
    });
    enhanceContent();
    observer.observe(activity, { childList: true, subtree: true });
  }
  ["progdv", "progr", "toast"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
    }
  });
})();
