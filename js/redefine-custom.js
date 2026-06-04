(function () {
  const routes = [
    ["/vn/", "/en/", "HOME"],
    ["/vn/kho-anh/", "/en/photo-gallery/", "PHOTO GALLERY"],
    ["/vn/phan-mem-cong-cu/", "/en/software-tools/", "SOFTWARE/TOOLS"],
    ["/vn/cong-cu-lam-web/", "/en/web-tools/", "WEB TOOLS"],
  ];

  const normalizePath = (pathname) =>
    pathname.endsWith("/") ? pathname : `${pathname}/`;

  const currentPath = () => normalizePath(window.location.pathname);
  const isEnglishPage = () => currentPath().startsWith("/en/");

  function setAnchorLabel(anchor, label) {
    const span = anchor.querySelector("span");
    if (span) {
      span.textContent = label;
      return;
    }

    const text = Array.from(anchor.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );

    if (text) text.textContent = ` ${label} `;
  }

  function switchTarget() {
    const current = currentPath();
    const route = routes.find(([viPath, enPath]) =>
      [viPath, enPath].includes(current)
    );

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
      video.preload = "auto";
      video.setAttribute("aria-hidden", "true");
      document.body.prepend(video);
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function syncNavigation() {
    const english = isEnglishPage();
    const homePath = english ? "/en/" : "/vn/";

    document
      .querySelectorAll(".navbar-content .logo-image, .navbar-content .logo-title")
      .forEach((anchor) => anchor.setAttribute("href", homePath));

    routes.forEach(([viPath, enPath, enLabel]) => {
      const target = english ? enPath : viPath;
      const links = [viPath, enPath]
        .map(
          (path) =>
            `.navbar-list a[href="${path}"], .drawer-navbar-list a[href="${path}"]`
        )
        .join(",");

      document.querySelectorAll(links).forEach((anchor) => {
        anchor.setAttribute("href", target);
        if (english) setAnchorLabel(anchor, enLabel);
      });
    });

    ["/vn/", "/en/"].forEach((rootPath) => {
      if (currentPath().startsWith(rootPath) && currentPath() !== rootPath) {
        document
          .querySelectorAll(
            `.navbar-list a[href="${rootPath}"], .drawer-navbar-list a[href="${rootPath}"]`
          )
          .forEach((anchor) => anchor.classList.remove("active"));
      }
    });
  }

  function addLanguageToggle() {
    const navbarRight = document.querySelector(".navbar-content .right");
    if (!navbarRight || navbarRight.querySelector(".custom-top-actions")) return;

    const actions = document.createElement("div");
    const button = document.createElement("button");

    actions.className = "custom-top-actions";
    button.className = "custom-top-action";
    button.type = "button";
    button.textContent = isEnglishPage() ? "EN" : "VI";
    button.setAttribute("aria-label", "Switch language");
    button.title = "Switch language";
    button.addEventListener("click", () => {
      window.location.href = switchTarget();
    });

    actions.append(button);
    navbarRight.append(actions);
  }

  function boot() {
    ensureVideoBackground();
    syncNavigation();
    addLanguageToggle();
  }

  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("swup:contentReplaced", boot);
})();
