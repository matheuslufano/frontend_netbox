import { NextRequest } from "next/server";

const defaultWhatsApp =
  "https://wa.me/55008006022732?text=Tenho%20interesse%20no%20Plano%20Familia%20Netbox.";

function jsString(value: string) {
  return JSON.stringify(value);
}

export function GET(request: NextRequest) {
  const apiBaseUrl = request.nextUrl.origin;

  const script = `(function () {
  var currentScript = document.currentScript;
  var API_BASE_URL = ${jsString(apiBaseUrl)};
  var DEFAULT_SELECTOR = ".whatsapp-conversion, #netbox-whatsapp-button, .netbox-whatsapp-button, [data-netbox-whatsapp]";
  var STORAGE_KEY = "netboxReferralCode";
  var PRODUCT = (currentScript && currentScript.dataset.product) || "Plano Familia Netbox";
  var BUTTON_SELECTOR = (currentScript && currentScript.dataset.buttonSelector) || DEFAULT_SELECTOR;
  var FALLBACK_WHATSAPP = (currentScript && currentScript.dataset.fallbackWhatsapp) || ${jsString(defaultWhatsApp)};
  var MESSAGE = currentScript && currentScript.dataset.message;

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return "";
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {}
  }

  function getReferralCode() {
    var params = new URLSearchParams(window.location.search);
    var ref = (
      params.get("ref") ||
      params.get("shortCode") ||
      params.get("link") ||
      ""
    ).trim();

    if (ref) {
      storageSet(STORAGE_KEY, ref);
      return ref;
    }

    return (storageGet(STORAGE_KEY) || "").trim();
  }

  function buildButtonHref() {
    var ref = getReferralCode();

    if (!ref) {
      return FALLBACK_WHATSAPP;
    }

    var conversionUrl = new URL(
      "/links/" + encodeURIComponent(ref) + "/whatsapp",
      API_BASE_URL
    );
    conversionUrl.searchParams.set("product", PRODUCT);

    if (MESSAGE) {
      conversionUrl.searchParams.set("message", MESSAGE);
    }

    return conversionUrl.toString();
  }

  function updateButton(button, href) {
    if (!button || button.dataset.netboxNoTrack === "true") {
      return;
    }

    button.dataset.netboxWhatsappHref = href;

    if (button.tagName && button.tagName.toLowerCase() === "a") {
      button.setAttribute("href", href);
    }
  }

  function getButtons() {
    try {
      return toArray(document.querySelectorAll(BUTTON_SELECTOR));
    } catch (error) {
      return [];
    }
  }

  function findButton(target) {
    if (!target || typeof target.closest !== "function") {
      return null;
    }

    try {
      return target.closest(BUTTON_SELECTOR);
    } catch (error) {
      return null;
    }
  }

  function updateButtons() {
    var href = buildButtonHref();

    getButtons().forEach(function (button) {
      updateButton(button, href);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateButtons);
  } else {
    updateButtons();
  }

  document.addEventListener("click", function (event) {
    var button = findButton(event.target);

    if (!button || button.dataset.netboxNoTrack === "true") {
      return;
    }

    var href = buildButtonHref();
    updateButton(button, href);

    if (!(button.tagName && button.tagName.toLowerCase() === "a")) {
      event.preventDefault();
      window.location.href = href;
    }
  });
})();`;

  return new Response(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
