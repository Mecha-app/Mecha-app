/**
 * Pre-paint theme bootstrap (DESIGN_SYSTEM §2.3).
 * Runs inline in <head> before first paint: reads the persisted preference
 * (localStorage "mecha-theme"), falls back to prefers-color-scheme on first
 * visit ONLY, defaults to dark (the brand "night cockpit"), and sets
 * data-theme on <html> so there is no flash of the wrong theme.
 */
const SCRIPT = `(function(){document.documentElement.classList.add("js");try{var t=localStorage.getItem("mecha-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
