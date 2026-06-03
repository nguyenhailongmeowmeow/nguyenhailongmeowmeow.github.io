(function () {
  const languageMap = {
    "/vn/": "/en/",
    "/vn/kho-anh/": "/en/photo-gallery/",
    "/vn/phan-mem-cong-cu/": "/en/software-tools/",
    "/vn/cong-cu-lam-web/": "/en/web-tools/",
    "/en/": "/vn/",
    "/en/photo-gallery/": "/vn/kho-anh/",
    "/en/software-tools/": "/vn/phan-mem-cong-cu/",
    "/en/web-tools/": "/vn/cong-cu-lam-web/",
  };
  const navigationMap = [
    {
      viPath: "/vn/",
      enPath: "/en/",
      enLabel: "HOME",
    },
    {
      viPath: "/vn/kho-anh/",
      enPath: "/en/photo-gallery/",
      enLabel: "PHOTO GALLERY",
    },
    {
      viPath: "/vn/phan-mem-cong-cu/",
      enPath: "/en/software-tools/",
      enLabel: "SOFTWARE/TOOLS",
    },
    {
      viPath: "/vn/cong-cu-lam-web/",
      enPath: "/en/web-tools/",
      enLabel: "WEB TOOLS",
    },
  ];

  function normalizePath(pathname) {
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  }

  function isEnglishPage() {
    return normalizePath(window.location.pathname).startsWith("/en/");
  }

  function getLanguageTarget() {
    const current = normalizePath(window.location.pathname);
    return languageMap[current] || (isEnglishPage() ? "/vn/" : "/en/");
  }

  function setAnchorLabel(anchor, label) {
    const drawerLabel = anchor.querySelector("span");
    if (drawerLabel) {
      drawerLabel.textContent = label;
      return;
    }

    const textNode = Array.from(anchor.childNodes).find(function (node) {
      return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
    });

    if (textNode) {
      textNode.textContent = ` ${label} `;
    } else {
      anchor.appendChild(document.createTextNode(` ${label} `));
    }
  }

  function syncNavigationLanguage() {
    const english = isEnglishPage();
    const homePath = english ? "/en/" : "/vn/";

    document
      .querySelectorAll(".navbar-content .logo-image, .navbar-content .logo-title")
      .forEach(function (anchor) {
        anchor.setAttribute("href", homePath);
      });

    navigationMap.forEach(function (item) {
      const fromPath = english ? item.viPath : item.enPath;
      const toPath = english ? item.enPath : item.viPath;

      document
        .querySelectorAll(
          `.navbar-list a[href="${fromPath}"], .drawer-navbar-list a[href="${fromPath}"], .navbar-list a[href="${toPath}"], .drawer-navbar-list a[href="${toPath}"]`
        )
        .forEach(function (anchor) {
          anchor.setAttribute("href", toPath);
          if (english) {
            setAnchorLabel(anchor, item.enLabel);
          }
        });
    });
  }

  function ensureVideoBackground() {
    let video = document.getElementById("redefine-video-background");
    if (!video) {
      video = document.createElement("video");
      video.id = "redefine-video-background";
      video.src = "/images/background.mp4?v=12";
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("aria-hidden", "true");
      document.body.prepend(video);
    }

    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
  }

  function addTopActions() {
    ensureVideoBackground();
    syncNavigationLanguage();
    fixNavbarActiveState();

    const navbarRight = document.querySelector(".navbar-content .right");
    if (!navbarRight || navbarRight.querySelector(".custom-top-actions")) {
      return;
    }

    const actions = document.createElement("div");
    actions.className = "custom-top-actions";

    const languageButton = document.createElement("button");
    languageButton.className = "custom-top-action custom-language-toggle";
    languageButton.type = "button";
    languageButton.textContent = isEnglishPage() ? "EN" : "VI";
    languageButton.setAttribute("aria-label", "Switch language");
    languageButton.setAttribute("title", "Switch language");
    languageButton.addEventListener("click", function () {
      window.location.href = getLanguageTarget();
    });

    actions.append(languageButton);
    navbarRight.appendChild(actions);
  }

  function removeActiveToken(element) {
    if (!element) {
      return;
    }

    element.classList.remove("active");
  }

  function fixNavbarActiveState() {
    const current = normalizePath(window.location.pathname);
    ["/vn/", "/en/"].forEach(function (rootPath) {
      if (!current.startsWith(rootPath) || current === rootPath) {
        return;
      }

      document
        .querySelectorAll(`.navbar-list a[href="${rootPath}"], .drawer-navbar-list a[href="${rootPath}"]`)
        .forEach(removeActiveToken);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensureVideoBackground();
    addTopActions();
  });
  document.addEventListener("swup:contentReplaced", addTopActions);
  window.setTimeout(function () {
    ensureVideoBackground();
    addTopActions();
  }, 400);
})();
