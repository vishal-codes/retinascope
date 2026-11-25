"use client";

import { useEffect, useState } from "react";

const sections = [
  ["home", "Home"], ["analyze", "Analyze"],
  ["how-it-works", "How It Works"], ["severity-guide", "Severity Guide"],
];

export default function Navigation() {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState("home");
  useEffect(() => {
    function update() {
      const current = sections.filter(([id]) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 120);
      setActive(current.at(-1)?.[0] ?? "home");
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  function toggleTheme() {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* Storage is optional. */ }
  }

  const links = sections.map(([id, label]) => <a key={id} href={"#" + id}
    className={active === id ? "is-active" : undefined} aria-current={active === id ? "location" : undefined}
    onClick={() => setMenu(false)}>{label}</a>);

  return <header className="site-header"><div className="container site-header__stack">
    <nav className="nav glass" aria-label="Primary navigation">
      <a className="brand" href="#home"><span className="brand__dot" />RetinaScope</a>
      <div className="nav-right">
        <div className="nav-links">{links}</div>
        <button className="theme-toggle" onClick={toggleTheme}>
          <span className="theme-toggle__icon--sun"><span aria-hidden="true">☀</span><span className="visually-hidden">Switch to dark mode</span></span>
          <span className="theme-toggle__icon--moon"><span aria-hidden="true">☾</span><span className="visually-hidden">Switch to light mode</span></span>
        </button>
        <button className={"nav-toggle" + (menu ? " is-open" : "")} aria-label="Navigation menu" aria-expanded={menu}
          aria-controls="mobile-menu" onClick={() => setMenu(!menu)}><span /><span /><span /></button>
      </div>
    </nav>
    <nav id="mobile-menu" aria-label="Mobile navigation" hidden={!menu} className={"mobile-nav glass" + (menu ? " is-open" : "")}>{links}</nav>
  </div></header>;
}
