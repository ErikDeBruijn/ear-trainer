// js/storage.js
const KEY = "eartrainer_v01";
export const store = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
    save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
};