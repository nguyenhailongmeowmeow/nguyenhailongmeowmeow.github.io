(function () {
  var ipProfileCacheVersion = 3;
  var devtoolOverlayTimer;
  var devtoolOpenAttempts = Number(
    sessionStorage.getItem("devtoolOpenAttempts") || "0",
  );
  var visitorIpProfile = readCachedIpProfile();
  var visitorIpRequested = Boolean(
    visitorIpProfile.loaded &&
      (visitorIpProfile.ip || visitorIpProfile.location || visitorIpProfile.isp),
  );
  var isEnglishPage = window.location.pathname.indexOf("/en/") === 0;
  var text = isEnglishPage
    ? {
        title: "Oh dude, why are you opening Developer Tools?",
        message: "Please close it and refresh the page to continue.",
        ipLabel: "Your IP address is:",
        loading: "loading...",
        unknown: "unknown",
        notAvailable: "not available",
        ipv4: "IPv4",
        ipv6: "IPv6",
        location: "Location",
        isp: "ISP / ASN",
      }
    : {
        title: "Bạn đã mở Developer Tools :(((",
        message:
          "Làm ơn hãy đóng DevTools và tải lại trang để tiếp tục.",
        ipLabel: "IP của bạn là:",
        loading: "đang tải...",
        unknown: "không xác định",
        notAvailable: "không có",
        ipv4: "IPv4",
        ipv6: "IPv6",
        location: "Vị trí",
        isp: "Nhà mạng / ASN",
      };

  function readCachedIpProfile() {
    try {
      var profile = JSON.parse(sessionStorage.getItem("visitorIpProfile") || "{}");
      return profile.cacheVersion === ipProfileCacheVersion ? profile : {};
    } catch (_error) {
      return {};
    }
  }

  function writeCachedIpProfile(profile) {
    profile.cacheVersion = ipProfileCacheVersion;
    visitorIpProfile = profile;
    sessionStorage.setItem("visitorIpProfile", JSON.stringify(profile));
    sessionStorage.setItem("visitorIp", profile.ip || "");
    renderIpProfile();
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("IP lookup failed");
      return response.json();
    });
  }

  function isIpv6(ip) {
    return typeof ip === "string" && ip.indexOf(":") !== -1;
  }

  function compactLocation(parts) {
    return parts.filter(Boolean).join(", ");
  }

  function normalizeIpapi(data) {
    return {
      ip: data.ip,
      ipv4: isIpv6(data.ip) ? "" : data.ip,
      ipv6: isIpv6(data.ip) ? data.ip : "",
      location: compactLocation([data.city, data.region, data.country_name]),
      isp: compactLocation([data.org, data.asn]),
    };
  }

  function normalizeIpwho(data) {
    if (!data || data.success === false) return {};

    return {
      ip: data.ip,
      ipv4: isIpv6(data.ip) ? "" : data.ip,
      ipv6: isIpv6(data.ip) ? data.ip : "",
      location: compactLocation([data.city, data.region, data.country]),
      isp: compactLocation([
        data.connection && data.connection.isp,
        data.connection && data.connection.asn
          ? "AS" + data.connection.asn
          : "",
      ]),
    };
  }

  function normalizeIpinfo(data) {
    return {
      ip: data.ip,
      ipv4: isIpv6(data.ip) ? "" : data.ip,
      ipv6: isIpv6(data.ip) ? data.ip : "",
      location: compactLocation([data.city, data.region, data.country]),
      isp: data.org || "",
    };
  }

  function mergeProfile() {
    var profile = { loaded: true };

    for (var i = 0; i < arguments.length; i += 1) {
      var data = arguments[i] || {};
      Object.keys(data).forEach(function (key) {
        if (data[key] && !profile[key]) profile[key] = data[key];
      });
    }

    profile.ip = profile.ip || profile.ipv4 || profile.ipv6 || "";
    return profile;
  }

  function loadVisitorIpProfile() {
    if (visitorIpRequested) return;
    visitorIpRequested = true;

    Promise.allSettled([
      fetchJson("https://api64.ipify.org?format=json"),
      fetchJson("https://api.ipify.org?format=json"),
      fetchJson("https://api6.ipify.org?format=json"),
      fetchJson("https://ipwho.is/"),
      fetchJson("https://ipinfo.io/json"),
      fetchJson("https://ipapi.co/json/"),
    ])
      .then(function (results) {
        var universal =
          results[0].status === "fulfilled" ? results[0].value.ip : "";
        var ipv4 =
          results[1].status === "fulfilled" ? results[1].value.ip : "";
        var ipv6 =
          results[2].status === "fulfilled" ? results[2].value.ip : "";
        var ipwhoGeo =
          results[3].status === "fulfilled"
            ? normalizeIpwho(results[3].value)
            : {};
        var ipinfoGeo =
          results[4].status === "fulfilled"
            ? normalizeIpinfo(results[4].value)
            : {};
        var ipapiGeo =
          results[5].status === "fulfilled"
            ? normalizeIpapi(results[5].value)
            : {};

        writeCachedIpProfile(
          mergeProfile(
            {
              ip: universal || ipv4 || ipv6,
              ipv4:
                (ipv4 && !isIpv6(ipv4) ? ipv4 : "") ||
                (universal && !isIpv6(universal) ? universal : ""),
              ipv6:
                (ipv6 && isIpv6(ipv6) ? ipv6 : "") ||
                (universal && isIpv6(universal) ? universal : ""),
            },
            ipwhoGeo,
            ipinfoGeo,
            ipapiGeo,
          ),
        );
      })
      .catch(function () {
        writeCachedIpProfile({ loaded: true });
      });
  }

  function getIpValue(key) {
    if (!visitorIpProfile.loaded) return text.loading;
    if (key === "ipv6" && !visitorIpProfile.ipv6) return text.notAvailable;
    return visitorIpProfile[key] || text.unknown;
  }

  function renderIpProfile() {
    var overlay = document.getElementById("developer-tools-blocker");
    if (!overlay) return;

    var values = {
      ip: getIpValue("ip"),
      ipv4: getIpValue("ipv4"),
      ipv6: getIpValue("ipv6"),
      location: getIpValue("location"),
      isp: getIpValue("isp"),
    };

    Object.keys(values).forEach(function (key) {
      var target = overlay.querySelector("[data-devtool-" + key + "]");
      if (target) target.textContent = values[key];
    });
  }

  function showDevtoolOverlay() {
    var root = document.body || document.documentElement;
    if (!root) return;

    var overlay = document.getElementById("developer-tools-blocker");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "developer-tools-blocker";
      overlay.setAttribute("role", "alert");
      overlay.setAttribute("aria-live", "assertive");
      overlay.innerHTML =
        '<div class="developer-tools-blocker__panel">' +
        "<strong>" +
        text.title +
        "</strong>" +
        "<span>" +
        text.message +
        "</span>" +
        '<div class="developer-tools-ip-card">' +
        '<div class="developer-tools-ip-primary"><span>' +
        text.ipLabel +
        '</span><b data-devtool-ip>' +
        text.loading +
        "</b></div>" +
        '<dl class="developer-tools-ip-grid">' +
        "<div><dt>" +
        text.ipv4 +
        '</dt><dd data-devtool-ipv4>' +
        text.loading +
        "</dd></div>" +
        "<div><dt>" +
        text.ipv6 +
        '</dt><dd data-devtool-ipv6>' +
        text.loading +
        "</dd></div>" +
        "<div><dt>" +
        text.location +
        '</dt><dd data-devtool-location>' +
        text.loading +
        "</dd></div>" +
        "<div><dt>" +
        text.isp +
        '</dt><dd data-devtool-isp>' +
        text.loading +
        "</dd></div>" +
        "</dl></div></div>";
      root.appendChild(overlay);
    }

    renderIpProfile();
    loadVisitorIpProfile();

    document.documentElement.classList.add("developer-tools-locked");
    if (document.body) document.body.classList.add("developer-tools-locked");

    overlay.classList.remove("developer-tools-blocker--pulse");
    void overlay.offsetWidth;
    overlay.classList.add("developer-tools-blocker--pulse");
  }

  function startDevtoolOverlaySpam() {
    devtoolOpenAttempts += 1;
    sessionStorage.setItem("devtoolOpenAttempts", String(devtoolOpenAttempts));
    showDevtoolOverlay();

    window.clearInterval(devtoolOverlayTimer);
    devtoolOverlayTimer = window.setInterval(showDevtoolOverlay, 700);
  }

  function stopDevtoolOverlaySpam() {
    window.clearInterval(devtoolOverlayTimer);
    var overlay = document.getElementById("developer-tools-blocker");
    if (overlay) overlay.remove();
    document.documentElement.classList.remove("developer-tools-locked");
    if (document.body) document.body.classList.remove("developer-tools-locked");
  }

  function isDevtoolShortcut(event) {
    var key = event.key.toLowerCase();
    return (
      event.key === "F12" ||
      (event.ctrlKey && event.shiftKey && ["i", "j", "c"].indexOf(key) !== -1) ||
      (event.metaKey && event.altKey && ["i", "j", "c"].indexOf(key) !== -1)
    );
  }

  document.addEventListener(
    "keydown",
    function (event) {
      if (isDevtoolShortcut(event)) startDevtoolOverlaySpam();
    },
    true,
  );

  if (window.DisableDevtool)
    DisableDevtool({
      disableMenu: true,
      clearLog: true,
      ondevtoolopen: function (_type, next) {
        startDevtoolOverlaySpam();
        next();
      },
      ondevtoolclose: stopDevtoolOverlaySpam,
    });
})();
