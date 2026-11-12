/* Shared UX for the existing PHP/AJAX workspaces. No endpoint changes. */
(() => {
  const activity = document.querySelector(".mainactivity");
  if (!activity) return;
  const descriptions = {
    farmers:
      "Review farmer accounts and keep your community details up to date.",
    pickups: "Manage the places where farmers bring their produce.",
    sales: "Follow purchases, sales, and the records behind each transaction.",
    inputs: "Explore farm inputs and keep track of purchases.",
    payments: "Review payment activity and outstanding balances.",
    news: "Local updates and practical information for your farming community.",
    produce: "Track produce, supplies, and collection activity in one place.",
    demand:
      "Manage produce requirements, pricing, and available opportunities.",
    addprod: "Maintain your product catalogue and availability.",
    products: "Explore available products and review your purchases.",
    agronomist: "Manage the people providing expert support to farmers.",
    chats: "Stay in touch with your agronomist and farming community.",
    agronchats: "Keep questions, advice, and farmer conversations connected.",
    myacc: "Keep your personal details and account information up to date.",
    agacc: "Keep your personal details and account information up to date.",
    account: "Keep your personal details and account information up to date.",
  };
  let currentPage = null;
  let searchValue = "";
  let requestInProgress = false;
  const originalLoad = window.loadpage;
  if (typeof originalLoad === "function") {
    window.loadpage = function (page) {
      searchValue = "";
      currentPage = page;
      requestInProgress = true;
      activity.setAttribute("aria-busy", "true");
      activity.classList.add("is-loading");
      return originalLoad.apply(this, arguments);
    };
  }
  function filterRecords() {
    const query = searchValue.trim().toLocaleLowerCase();
    let total = 0,
      visible = 0;
    activity.querySelectorAll(".table-scroll table").forEach((table) => {
      [...table.rows].forEach((row) => {
        if (
          row.querySelector("th") ||
          row.querySelector("input,select,textarea")
        )
          return;
        total++;
        const matches =
          !query || row.textContent.toLocaleLowerCase().includes(query);
        row.hidden = !matches;
        if (matches) visible++;
      });
    });
    const counter = activity.querySelector(".records-count");
    if (counter)
      counter.textContent = query
        ? `${visible} of ${total} records`
        : `${total} ${total === 1 ? "record" : "records"}`;
    const empty = activity.querySelector(".search-empty");
    if (empty) empty.hidden = !query || visible > 0;
  }
  function enhanceSection() {
    if (!currentPage || requestInProgress) return;
    const link = document.querySelector(".workspace-link.is-active");
    const label = link?.querySelector("span")?.textContent || "Your workspace";
    if (!activity.querySelector(".workspace-section-head")) {
      const heading = document.createElement("div");
      heading.className = "workspace-section-head";
      const title = document.createElement("h1");
      title.textContent = label;
      title.tabIndex = -1;
      const description = document.createElement("p");
      description.textContent =
        descriptions[link?.dataset.page] ||
        "Review your information and manage the details that matter.";
      const eyebrow = document.createElement("span");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = "YOUR SMART FARM WORKSPACE";
      heading.append(eyebrow, title, description);
      activity.prepend(heading);
    }
    const hasRecords = [...activity.querySelectorAll("table")].some(
      (table) => !table.closest("form") && table.rows.length > 1,
    );
    if (hasRecords && !activity.querySelector(".records-toolbar")) {
      const toolbar = document.createElement("div");
      toolbar.className = "records-toolbar";
      const search = document.createElement("input");
      search.type = "search";
      search.placeholder = "Search these records…";
      search.setAttribute("aria-label", "Search records in this section");
      search.value = searchValue;
      const counter = document.createElement("span");
      counter.className = "records-count";
      counter.setAttribute("role", "status");
      counter.setAttribute("aria-live", "polite");
      search.addEventListener("input", () => {
        searchValue = search.value;
        filterRecords();
      });
      toolbar.append(search, counter);
      activity.querySelector(".workspace-section-head").after(toolbar);
      const empty = document.createElement("p");
      empty.className = "search-empty empty-state";
      empty.textContent =
        "No matching records. Try another name or clear your search.";
      empty.hidden = true;
      toolbar.after(empty);
    }
    filterRecords();
  }
  const observer = new MutationObserver(() => {
    observer.disconnect();
    enhanceSection();
    observer.observe(activity, { childList: true, subtree: true });
  });
  observer.observe(activity, { childList: true, subtree: true });
  if (window.jQuery) {
    window.jQuery(document).ajaxComplete((_event, xhr, settings) => {
      if (
        !requestInProgress ||
        settings.type !== "GET" ||
        !settings.url.includes("operations.php")
      )
        return;
      requestInProgress = false;
      activity.setAttribute("aria-busy", "false");
      activity.classList.remove("is-loading");
      enhanceSection();
      if (xhr.status >= 200 && xhr.status < 300)
        activity
          .querySelector(".workspace-section-head h1")
          ?.focus({ preventScroll: true });
    });
  }
})();
