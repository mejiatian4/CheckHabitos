// Helpers mínimos para construir el DOM sin un framework, de forma tipada.

type Attrs = Record<string, string | number | boolean | undefined>;

/** Crea un elemento con atributos, clases y contenido. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('data-') || key === 'role' || key.startsWith('aria-'))
      node.setAttribute(key, String(value));
    else if (key in node) (node as unknown as Record<string, unknown>)[key] = value;
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** Atajo de querySelector con tipo. Lanza si no encuentra el elemento. */
export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`No se encontró el elemento: ${selector}`);
  return found;
}

/** Vacía un contenedor. */
export function clear(node: Element): void {
  node.replaceChildren();
}
