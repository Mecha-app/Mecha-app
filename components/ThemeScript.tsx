/**
 * Pre-paint theme bootstrap (DESIGN_SYSTEM §2.3).
 * Runs inline in <head> before first paint and sets data-theme on <html>
 * so there is no flash of the wrong theme. [data-theme] is the SINGLE
 * theme-switching mechanism: it honors the persisted preference
 * (localStorage "mecha-theme", set by ThemeToggle) and otherwise
 * defaults to dark, the brand "night cockpit". It deliberately does NOT
 * consult prefers-color-scheme: an OS-driven default selected the light
 * theme on the owner's phone while the design passes were audited in
 * dark, and a second input to the same attribute is a desync risk —
 * the visitor's explicit toggle choice is the only light-theme opt-in.
 */
const SCRIPT = `(function(){document.documentElement.classList.add("js");try{var t=localStorage.getItem("mecha-theme");if(t!=="light"&&t!=="dark"){t="dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
