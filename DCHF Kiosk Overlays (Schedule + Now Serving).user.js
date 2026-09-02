// ==UserScript==
// @name         DCHF Kiosk Overlays (Schedule + Now Serving)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fixed schedule + time-based NOW SERVING overlays for kiosk mode
// @match        https://panda.sfmfoodbank.org/distro/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    "use strict";

    // -------------------------------
    // CONFIGURATION
    // -------------------------------

    const BASE = "https://raw.githubusercontent.com/PCCSF-FOODPANTRY/PCCC-Cards/main/images/";

    // Fixed schedule image
    const SCHEDULE_IMAGE = BASE + "Saturday Schedule.jpg";

    // Time-based NOW SERVING images
    const scheduleMap = [
        { start: "11:15", end: "11:35", file: "RED.jpg" },
        { start: "11:35", end: "11:55", file: "GREEN.jpg" },
        { start: "11:55", end: "12:15", file: "YELLOW.jpg" },
        { start: "12:15", end: "12:35", file: "BLUE.jpg" },
        { start: "12:35", end: "12:55", file: "PURPLE.jpg" }
    ];

    // Placement (adjust later with staff)
    const schedulePos = { top: "0px", right: "0px" };
    const nowServingPos = { top: "115px", right: "0px" };

    // Auto-refresh interval (ms)
    const REFRESH_MS = 5 * 60 * 1000; // 5 minutes


    // -------------------------------
    // CREATE FIXED OVERLAY IMAGE
    // -------------------------------

    function createOverlay(id, url, pos) {
        let img = document.getElementById(id);
        if (!img) {
            img = document.createElement("img");
            img.id = id;
            img.style.position = "fixed";
            img.style.zIndex = "999999999";
            img.style.pointerEvents = "none";
            img.style.width = "260px";
            img.style.height = "auto";
            img.style.border = "none";
            img.style.boxShadow = "none";
            img.style.margin = "0";
            img.style.padding = "0";
            document.body.appendChild(img);
        }

        // Apply placement
        img.style.top = pos.top || "auto";
        img.style.bottom = pos.bottom || "auto";
        img.style.left = pos.left || "auto";
        img.style.right = pos.right || "auto";

        // Load image
        img.src = url + "?cacheBust=" + Date.now();
    }


    // -------------------------------
    // TIME CHECKER
    // -------------------------------

    function getMinutes(t) {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    }

    function currentNowServingImage() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();

        for (const slot of scheduleMap) {
            const start = getMinutes(slot.start);
            const end = getMinutes(slot.end);
            if (minutes >= start && minutes < end) {
                return BASE + slot.file;
            }
        }

        return null; // outside schedule
    }


    // -------------------------------
    // UPDATE NOW SERVING OVERLAY
    // -------------------------------

    function updateNowServing() {
        const url = currentNowServingImage();
        if (!url) return;

        createOverlay("kioskNowServingOverlay", url, nowServingPos);
    }


    // -------------------------------
    // AUTO-REFRESH LOGIC
    // -------------------------------

    function refreshAll() {
        createOverlay("kioskScheduleOverlay", SCHEDULE_IMAGE, schedulePos);
        updateNowServing();
    }


    // -------------------------------
    // BOOTSTRAP
    // -------------------------------

    refreshAll();
    setInterval(refreshAll, REFRESH_MS);

})();