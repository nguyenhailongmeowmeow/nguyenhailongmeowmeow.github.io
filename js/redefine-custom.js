(function () {
  if (window.__redefineCustomLoaded) {
    window.__redefineCustomBoot && window.__redefineCustomBoot();
    return;
  }

  window.__redefineCustomLoaded = true;

  const routes = [
    ["/vn/", "/en/", "TRANG CH\u1ee6", "HOME"],
    ["/vn/kho-anh/", "/en/photo-gallery/", "KHO \u1ea2NH", "PHOTO GALLERY"],
    [
      "/vn/phan-mem-cong-cu/",
      "/en/software-tools/",
      "PH\u1ea6N M\u1ec0M/C\u00d4NG C\u1ee4",
      "SOFTWARE/TOOLS",
    ],
    [
      "/vn/cong-cu-lam-web/",
      "/en/web-tools/",
      "C\u00d4NG C\u1ee4 L\u00c0M WEB",
      "WEB TOOLS",
    ],
  ];
  const themeStatusKey = "REDEFINE-THEME-STATUS";
  let videoBackgroundScheduled = false;

  const normalizePath = (pathname) =>
    pathname.endsWith("/") ? pathname : `${pathname}/`;

  const currentPath = () => normalizePath(window.location.pathname);
  const isEnglishPage = () => currentPath().startsWith("/en/");

  function pathFromHref(href) {
    try {
      return normalizePath(new URL(href, window.location.origin).pathname);
    } catch (error) {
      return normalizePath(href);
    }
  }

  function routeForPath(path) {
    const normalized = normalizePath(path);
    return routes.find(([viPath, enPath]) =>
      [viPath, enPath].includes(normalized),
    );
  }

  function readThemeStatus() {
    try {
      const raw = localStorage.getItem(themeStatusKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeThemeStatus(isDark) {
    const status = readThemeStatus() || {
      isExpandPageWidth: false,
      fontSizeLevel: 0,
      isOpenPageAside: true,
    };

    status.isDark = isDark;
    localStorage.setItem(themeStatusKey, JSON.stringify(status));
  }

  function applyThemeClass(isDark) {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);
  }

  function syncStoredTheme() {
    const stored = readThemeStatus();
    if (stored && typeof stored.isDark === "boolean") {
      applyThemeClass(stored.isDark);
    }
  }

  function persistCurrentTheme() {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark-mode");

    writeThemeStatus(isDark);
  }

  function setAnchorLabel(anchor, label) {
    const span = anchor.querySelector(":scope > span");
    if (span) {
      if (span.textContent !== label) {
        span.textContent = label;
      }
      return;
    }

    const textNodes = Array.from(anchor.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE,
    );
    const text = textNodes.find((node) => node.textContent.trim());

    if (text && text.textContent !== ` ${label} `) {
      text.textContent = ` ${label} `;
    }
    textNodes
      .filter((node) => node !== text && node.textContent.trim())
      .forEach((node) => {
        node.textContent = " ";
      });
  }

  function switchTarget() {
    const route = routeForPath(currentPath());

    if (route) return isEnglishPage() ? route[0] : route[1];
    return isEnglishPage() ? "/vn/" : "/en/";
  }

  function ensureVideoBackground() {
    let video = document.getElementById("redefine-video-background");

    if (!video) {
      video = document.createElement("video");
      video.id = "redefine-video-background";
      video.src = "/images/background.mp4?v=13";
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("fetchpriority", "low");
      video.setAttribute("aria-hidden", "true");
      document.body.prepend(video);
    }

    if (!video.paused) return;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function scheduleVideoBackground() {
    if (videoBackgroundScheduled) return;
    videoBackgroundScheduled = true;

    const start = () => ensureVideoBackground();

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(start, { timeout: 1200 });
      return;
    }

    window.setTimeout(start, 400);
  }

  function syncNavigation() {
    const english = isEnglishPage();
    const homePath = english ? "/en/" : "/vn/";

    document
      .querySelectorAll(
        ".navbar-content .logo-image, .navbar-content .logo-title",
      )
      .forEach((anchor) => {
        if (anchor.getAttribute("href") !== homePath) {
          anchor.setAttribute("href", homePath);
        }
      });

    routes.forEach(([viPath, enPath, viLabel, enLabel]) => {
      const target = english ? enPath : viPath;
      const label = english ? enLabel : viLabel;
      document
        .querySelectorAll(".navbar-list a, .drawer-navbar-list a")
        .forEach((anchor) => {
          const route = routeForPath(
            pathFromHref(anchor.getAttribute("href") || ""),
          );
          if (!route || route[0] !== viPath || route[1] !== enPath) return;

          if (anchor.getAttribute("href") !== target) {
            anchor.setAttribute("href", target);
          }
          setAnchorLabel(anchor, label);
        });
    });

    ["/vn/", "/en/"].forEach((rootPath) => {
      if (currentPath().startsWith(rootPath) && currentPath() !== rootPath) {
        document
          .querySelectorAll(
            `.navbar-list a[href="${rootPath}"], .drawer-navbar-list a[href="${rootPath}"]`,
          )
          .forEach((anchor) => anchor.classList.remove("active"));
      }
    });
  }

  function handleNavigationClick(event) {
    const anchor = event.target.closest(
      ".navbar-list a, .drawer-navbar-list a, .navbar-content .logo-image, .navbar-content .logo-title",
    );

    if (!anchor) return;

    const route = routeForPath(pathFromHref(anchor.getAttribute("href") || ""));
    if (!route) return;

    const target = isEnglishPage() ? route[1] : route[0];
    if (pathFromHref(anchor.href) === target) return;

    persistCurrentTheme();
    anchor.setAttribute("href", target);
  }

  function addLanguageToggle() {
    const navbarRight = document.querySelector(".navbar-content .right");
    if (!navbarRight) return;

    const existingButton = navbarRight.querySelector(".custom-language-toggle");
    if (existingButton) {
      const target = switchTarget();
      const label = isEnglishPage() ? "EN" : "VN";
      if (existingButton.getAttribute("href") !== target) {
        existingButton.href = target;
      }
      if (existingButton.textContent !== label) {
        existingButton.textContent = label;
      }
      return;
    }

    const actions = document.createElement("div");
    const button = document.createElement("a");

    actions.className = "custom-top-actions";
    button.className = "custom-top-action custom-language-toggle";
    button.href = switchTarget();
    button.textContent = isEnglishPage() ? "EN" : "VN";
    button.setAttribute("aria-label", "Switch language");
    button.title = "Switch language";
    button.addEventListener("click", () => {
      persistCurrentTheme();
      button.href = switchTarget();
    });

    actions.append(button);
    navbarRight.append(actions);
  }

  function syncScrolledNavbar() {
    document.documentElement.classList.toggle(
      "custom-navbar-solid",
      window.scrollY > 24,
    );
  }

  function closeMeomaybePopup() {
    const popup = document.querySelector(".meomaybe-popup-overlay");
    if (popup) {
      popup.remove();
    }
  }

  function openMeomaybePopup(config) {
    closeMeomaybePopup();

    const overlay = document.createElement("div");
    const dialog = document.createElement("div");
    const closeButton = document.createElement("button");
    const title = document.createElement("div");
    const image = document.createElement("img");
    const credit = document.createElement("a");

    overlay.className = "meomaybe-popup-overlay";
    dialog.className = "meomaybe-popup";
    closeButton.className = "meomaybe-popup-close";
    title.className = "meomaybe-popup-title";
    image.className = "meomaybe-popup-image";
    credit.className = "meomaybe-popup-credit";

    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    closeButton.type = "button";
    closeButton.textContent = "X";
    closeButton.setAttribute("aria-label", "Close popup");
    title.textContent = config.title || "U Bel";
    image.src = config.image || "/images/meomaybe.webp";
    image.alt = config.title || "Meo maybe";
    credit.textContent = config.credit || "By: Không Phải Minh Vũ";
    credit.href =
      config.creditUrl || "https://www.facebook.com/Khongphaiminhvu";
    credit.target = "_blank";
    credit.rel = "noopener noreferrer";

    closeButton.addEventListener("click", closeMeomaybePopup);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeMeomaybePopup();
      }
    });

    dialog.append(closeButton, title, image, credit);
    overlay.append(dialog);
    document.body.append(overlay);
    closeButton.focus();
  }

  function handleMeomaybeClick(event) {
    const trigger = event.target.closest(".meomaybe-trigger");
    if (!trigger) return;

    const requiredClicks = Number.parseInt(trigger.dataset.clicks || "36", 10);
    const currentClicks =
      Number.parseInt(trigger.dataset.currentClicks || "0", 10) + 1;
    trigger.dataset.currentClicks = String(currentClicks);

    if (currentClicks < requiredClicks) return;

    trigger.dataset.currentClicks = "0";
    openMeomaybePopup({
      title: trigger.dataset.popupTitle,
      image: trigger.dataset.popupImage,
      credit: trigger.dataset.popupCredit,
      creditUrl: trigger.dataset.popupCreditUrl,
    });
  }

  function boot() {
    syncStoredTheme();
    scheduleVideoBackground();
    syncNavigation();
    addLanguageToggle();
    syncScrolledNavbar();
  }

  function scheduleBoot() {
    window.clearTimeout(window.__redefineCustomBootTimer);
    window.__redefineCustomBootTimer = window.setTimeout(boot, 30);
  }

  function observeNavbarChanges() {
    if (window.__redefineCustomObserver) return;

    window.__redefineCustomObserver = new MutationObserver(scheduleBoot);
    window.__redefineCustomObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  window.__redefineCustomBoot = boot;

  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("swup:page:view", boot);
  document.addEventListener("swup:content:replace", scheduleBoot);
  window.addEventListener("redefine:swup:ready", boot);
  window.addEventListener("scroll", syncScrolledNavbar, { passive: true });
  document.addEventListener("click", handleNavigationClick, true);
  document.addEventListener("click", handleMeomaybeClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMeomaybePopup();
    }
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".tool-dark-light-toggle")) {
      window.setTimeout(persistCurrentTheme, 0);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeNavbarChanges, {
      once: true,
    });
  } else {
    boot();
    observeNavbarChanges();
  }
})();

