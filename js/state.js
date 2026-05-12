/* ==================  state.js  =======================
 * Shared mutable state — imported by both app.js and ui.js
 * to avoid circular dependencies.
 * ===================================================== */

export let currentUser = null;
export const setCurrentUser = (user) => { currentUser = user; };
export const DEBUG = true;
