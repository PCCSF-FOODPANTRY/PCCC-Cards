// ==UserScript==
// @name         PANDA Flagged Attendee Checker
// @namespace    http://tampermonkey.net
// @version      1.3
// @description  Site‑specific CSV flag checker with update notifications and manual last-updated metadata
// @match        https://panda.sfmfoodbank.org/distro/*
// @connect      raw.githubusercontent.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==


(function () {
    'use strict';


    /* ----------------------------------------------------
       🔧 SITE‑SPECIFIC CONSTANTS (CHANGE THESE ONLY)
    ---------------------------------------------------- */
    const SITE_NAME = "PCCSF CCDC PANTRY SATURDAY";// Human readable
    const SITE_CODE = "PCCC";// Short code
    const CSV_URL = "https://raw.githubusercontent.com/PCCSF-FOODPANTRY/PCCC-Cards/refs/heads/main/data.csv?nocache=1";


    /* ----------------------------------------------------
       INTERNAL SETTINGS
    ---------------------------------------------------- */
    const DEBOUNCE_DELAY = 1500;
    const MODAL_DURATION = 5000;
    const LOG_KEY = "tm_reset_log_v4";
    const FIELD_ID = 'search';


    let csvData = [];
    let isLoaded = false;
    let debounceTimer = null;
    let lastCSVHash = null;

    // Manual last-updated note from CSV
    let csvLastUpdatedNote = "Unknown";

      /* ----------------------------------------------------
       Modal Stacking overlay
    ---------------------------------------------------- */

function tmStackModal(overlay, offset = 40) {
    const existing = document.querySelectorAll('.tm-global-modal');
    const count = existing.length;

    overlay.classList.add('tm-global-modal');

    // Offset each modal so they never overlap
    overlay.style.top = `${count * offset}px`;
    overlay.style.left = `${count * offset}px`;
}



    /* ----------------------------------------------------
       TOAST NOTIFICATION (AUTO-DISMISS)
    ---------------------------------------------------- */
    function showToast(message, title = SITE_NAME) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.background = '#333';
        toast.style.color = '#fff';
        toast.style.padding = '14px 20px';
        toast.style.borderRadius = '6px';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        toast.style.zIndex = '9999999';
        toast.style.fontSize = '14px';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        toast.style.maxWidth = '320px';


        toast.innerHTML = `
            <strong style="font-size:15px; color:#4fc3f7;">${title}</strong><br>
            ${message}
        `;


        document.body.appendChild(toast);


        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });


        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 10000); // 10 seconds
    }


    /* ----------------------------------------------------
       BLOCKING SITE CONFIRMATION MODAL (INITIAL LOAD)
    ---------------------------------------------------- */
    function showSiteConfirmationModal(message, title = SITE_NAME) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999999';

    // NEW: stack-aware positioning
    tmStackModal(overlay, 40);



        const modal = document.createElement('div');
        modal.style.background = '#fff';
        modal.style.padding = '24px 32px';
        modal.style.borderRadius = '10px';
        modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '420px';
        modal.style.fontSize = '16px';
        modal.style.border = '4px solid #4fc3f7';


        modal.innerHTML = `
            <strong style="font-size: 20px; color:#4fc3f7;">${title}</strong><br><br>
            ${message}<br><br>
            <button id="tm-site-ack-btn"
                style="padding: 8px 16px; font-size: 14px; cursor: pointer;">
                Acknowledge
            </button>
        `;


        overlay.appendChild(modal);
        document.body.appendChild(overlay);


        document.getElementById('tm-site-ack-btn').onclick = () => overlay.remove();
    }


    /* ----------------------------------------------------
       BLOCKING FLAG MODAL
    ---------------------------------------------------- */
    function showBlockingModal(message) {
    const overlay = document.createElement('div');
    overlay.id = "tm-flag-modal";
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999999';

    // NEW: stack-aware positioning
    tmStackModal(overlay, 40);



        const modal = document.createElement('div');
        modal.style.background = '#fff';
        modal.style.padding = '20px 30px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '420px';
        modal.style.fontSize = '16px';
        modal.style.border = '4px solid #d93025';


        modal.innerHTML = `
            <strong style="color:#d93025; font-size: 20px;">⚠️ ATTENDEE FLAG DETECTED</strong><br><br>
            ${message}<br><br>
            <button id="tm-ack-btn"
                style="padding: 8px 16px; font-size: 14px; cursor: pointer;">
                Acknowledge
            </button>
        `;


        overlay.appendChild(modal);
        document.body.appendChild(overlay);


        document.getElementById('tm-ack-btn').onclick = () => overlay.remove();
    }


    /* ----------------------------------------------------
       REMOTE CSV LOADER WITH MANUAL LAST-UPDATED SUPPORT
    ---------------------------------------------------- */
    function loadCSV() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: CSV_URL,
            onload: function(response) {
                if (!response || !response.responseText) return;


                const rawText = response.responseText;
                const newHash = btoa(rawText);
                const isFirstLoad = lastCSVHash === null;
                const isUpdate = lastCSVHash !== null && newHash !== lastCSVHash;
                lastCSVHash = newHash;


                csvLastUpdatedNote = "Unknown";


                csvData = rawText
                    .split('\n')
                    .map(line => line.replace('\r', '').trim())
                    .filter(line => line)
                    .map(line => {
                        const [rawKey, ...rest] = line.split(',');


                        // Detect manual last-updated row
                        if (rawKey === "__LAST_UPDATED__") {
    if (!Array.isArray(csvLastUpdatedNote)) csvLastUpdatedNote = [];
    csvLastUpdatedNote.push(rest.join(',').trim());
    return null; // skip
}


                        return {
                            key: rawKey.replace(/"/g, '').trim(),
                            value: rest.join(',').replace(/"/g, '').trim()
                        };
                    })
                    .filter(Boolean);


                isLoaded = true;


                if (isFirstLoad) {
    const updatesHTML = Array.isArray(csvLastUpdatedNote)
        ? `<strong>Last Updated:</strong><br>${csvLastUpdatedNote.map(line => `• ${line}`).join('<br>')}`
        : `<strong>Last Updated:</strong> ${csvLastUpdatedNote}`;

    showSiteConfirmationModal(
        `${csvData.length} records synced.<br><br>${updatesHTML}`,
        `${SITE_NAME} — System Ready`
    );
                } else if (isUpdate) {
    const latestNote = Array.isArray(csvLastUpdatedNote)
        ? csvLastUpdatedNote[csvLastUpdatedNote.length - 1]
        : csvLastUpdatedNote;

    showToast(
        `${csvData.length} records loaded.<br><strong>Last Updated:</strong> ${latestNote}`,
        `${SITE_NAME} — Update Received`
    );
}
            }
        });
    }


    /* ----------------------------------------------------
       INPUT HANDLER
    ---------------------------------------------------- */
    function inputHandler(event) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (!isLoaded) return;


            let value = event.target.value.trim();
            if (!value) return;


            if (value.toLowerCase().startsWith('^s')) {
                value = value.substring(2).trim();
            }


            const clean = value.toLowerCase();
            const match = csvData.find(row => row.key.toLowerCase() === clean);


            if (match) {
                showBlockingModal(`Action Required: "<strong>${match.value}</strong>"`);
            }
        }, DEBOUNCE_DELAY);
    }


    function attachListener() {
        const field = document.getElementById(FIELD_ID);
        if (!field) return;


        field.removeEventListener('input', inputHandler);
        field.addEventListener('input', inputHandler);
        field.dataset.tmListenerAttached = 'true';
    }


    /* ----------------------------------------------------
       INITIALIZATION
    ---------------------------------------------------- */
    function init() {
        loadCSV();
        setInterval(loadCSV, 10 * 60 * 1000); // auto-refresh every 10 min
        attachListener();
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }


    const observer = new MutationObserver(() => {
        const field = document.getElementById(FIELD_ID);
        if (field && !field.dataset.tmListenerAttached) attachListener();
    });
    observer.observe(document.body, { childList: true, subtree: true });


})();
