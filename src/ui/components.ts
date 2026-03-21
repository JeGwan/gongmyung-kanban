/**
 * Pure DOM helpers — no framework.
 * Uses Obsidian CSS variables for theming.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') elem.className = v;
      else if (k === 'text') elem.textContent = v;
      else elem.setAttribute(k, v);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') elem.appendText(child);
      else elem.appendChild(child);
    }
  }
  return elem;
}

export function badge(text: string, cls: string): HTMLElement {
  return el('span', { class: `gk-badge ${cls}`, text });
}
