// ==UserScript==
// @name         PCCC Kiosk Overlays (Schedule + Now Serving)
// @namespace    PCCSF-FOODPANTRY
// @version      1.1.0
// @description  Fixed schedule + synchronized time-based NOW SERVING overlays for kiosk mode
// @match        https://sfmfoodbank.org*
// @grant        GM_xmlhttpRequest
// @updateURL    https://githubusercontent.com
// @downloadURL  https://githubusercontent.com
// ==/UserScript==

(function() {
    "use strict";

    // -------------------------------
    // CONFIGURATION
    // -------------------------------

    const BASE = "https://githubusercontent.com";

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

    // -------------------------------
    // CORE LOGIC
    // -------------------------------

    function updateOverlay() {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeString = `${currentHours}:${currentMinutes}`;

        console.log(`Checking schedule overlays at: ${currentTimeString}`);

        // Your existing logic to find the matching file from scheduleMap 
        // and update the DOM element goes here...
    }

    // -------------------------------
    // CLOCK SYNC ENGINE
    // -------------------------------
    function startSyncedTimer() {
        // Run immediately on page load
        updateOverlay();

        // Calculate milliseconds remaining until the exact start of the next minute
        const now = new Date();
        const delayUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        // Wait for the next top of the minute, then start ticking every 60 seconds
        setTimeout(() => {
            updateOverlay(); // Run right on the minute mark
            
            // Keep running it precisely every 60 seconds thereafter
            setInterval(updateOverlay, 60000);
        }, delayUntilNextMinute);
    }

    // Initialize the engine
    startSyncedTimer();

})();