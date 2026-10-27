type Attributes = Record<string, string | number | boolean | null | undefined | EventListener>;
type Child = Node | string | null | undefined | false;

/** Creates an element. `onclick`-style keys add listeners; false/null/undefined attributes are skipped. */
export const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: readonly Child[]
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key === 'className' ? 'class' : key, value === true ? '' : String(value));
  });
  el.append(...children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false));
  return el;
};

export const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is missing from the page`);
  return el as T;
};
