import { App, Component, Keymap, MarkdownRenderer } from 'obsidian';

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, .cm-editor, .gk-card-edit';

export async function renderMarkdown(
  app: App,
  markdown: string,
  container: HTMLElement,
  sourcePath: string,
  component: Component
): Promise<void> {
  await MarkdownRenderer.render(app, markdown, container, sourcePath, component);
  wireInternalLinks(app, container, sourcePath);
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest(INTERACTIVE_SELECTOR) !== null;
}

function wireInternalLinks(app: App, container: HTMLElement, sourcePath: string): void {
  const links = container.querySelectorAll<HTMLAnchorElement>('a.internal-link');

  links.forEach(link => {
    if (link.dataset.gkLinkBound === 'true') return;

    link.dataset.gkLinkBound = 'true';
    link.draggable = false;

    link.addEventListener('click', (event) => {
      openInternalLink(app, sourcePath, link, event);
    });

    link.addEventListener('auxclick', (event) => {
      if (event.button === 1) openInternalLink(app, sourcePath, link, event);
    });

    link.addEventListener('dblclick', (event) => {
      event.stopPropagation();
    });

    link.addEventListener('dragstart', (event) => {
      event.preventDefault();
    });
  });
}

function openInternalLink(
  app: App,
  sourcePath: string,
  link: HTMLAnchorElement,
  event: MouseEvent
): void {
  const linkText = link.getAttribute('data-href')
    ?? link.getAttribute('href')
    ?? link.textContent?.trim()
    ?? '';

  if (!linkText || /^(https?|obsidian):/i.test(linkText)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  void app.workspace.openLinkText(linkText, sourcePath, Keymap.isModEvent(event));
}
