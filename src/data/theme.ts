export const subscribeTheme = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("mpd-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("mpd-theme-change", callback);
  };
};
export const getTheme = () => {
  try {
    return localStorage.getItem("mpd-theme") === "dark";
  } catch {
    return false;
  }
};
export const getServerTheme = () => false;
export function toggleTheme() {
  try {
    localStorage.setItem("mpd-theme", getTheme() ? "light" : "dark");
    window.dispatchEvent(new Event("mpd-theme-change"));
  } catch {}
}
