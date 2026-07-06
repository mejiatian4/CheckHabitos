// Iconos SVG inline (trazo de 1.75, estilo coherente). Devuelven un SVGElement.

const NS = 'http://www.w3.org/2000/svg';

function svg(paths: string, viewBox = '0 0 24 24'): SVGSVGElement {
  const node = document.createElementNS(NS, 'svg');
  node.setAttribute('viewBox', viewBox);
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', 'currentColor');
  node.setAttribute('stroke-width', '1.75');
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = paths;
  return node;
}

export const icons = {
  chevronLeft: () => svg('<path d="M15 18l-6-6 6-6"/>'),
  chevronRight: () => svg('<path d="M9 18l6-6-6-6"/>'),
  plus: () => svg('<path d="M12 5v14M5 12h14"/>'),
  pencil: () =>
    svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  trash: () =>
    svg('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  flame: () =>
    svg('<path d="M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-2 1-3-.2 2 1 3 1 3 .5-2-1-3 2-8Z"/>'),
  trophy: () =>
    svg(
      '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 5H4a2 2 0 0 0 0 4h3"/><path d="M17 5h3a2 2 0 0 1 0 4h-3"/>',
    ),
  check: () => svg('<path d="M20 6 9 17l-5-5"/>'),
  logout: () =>
    svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'),
};
