export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Tiny element helper: el('div', 'a b', parent) */
export function el(tag, className = '', parent = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

export function svgEl(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.appendChild(node);
  return node;
}

let counter = 0;
/** Unique ids for SVG gradients, so re-mounted scenes never collide. */
export const uid = (prefix) => `${prefix}-${++counter}`;
