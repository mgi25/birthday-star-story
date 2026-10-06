import { SVG_NS, el } from '../core/dom.js';

/**
 * A parallax layer: a full-stage element the camera moves at `depth`,
 * holding an SVG "band" whose art is authored directly in world units.
 *
 * `band: [top, bottom]` is the world-y range the art occupies. Only that strip
 * is painted, which keeps GPU memory down on phones. The band's viewBox is
 * kept exactly as wide as the screen, plus whatever the camera will reveal:
 * pass `camX: [min, max]` (the camera's horizontal travel in this scene) and
 * the band grows to cover it, or `overscan` for layers that drift sideways.
 * Art never stretches and nothing needs re-authoring per device.
 */
export function createLayer({
  stage,
  camera,
  name,
  depth = 1,
  depthX = depth,
  band = [0, 1000],
  svg = '',
  overscan = 0,
  camX = [0, 0],
  drift = false,
}) {
  const root = el('div', `layer layer--${name}`);
  root.setAttribute('aria-hidden', 'true');
  const host = drift ? el('div', 'layer__drift', root) : root;

  let svgNode = null;
  const [top, bottom] = band;
  // How far (world units) the camera's travel reveals beyond each screen edge.
  const shiftL = Math.min(0, camX[0] * depthX);
  const shiftR = Math.max(0, camX[1] * depthX);

  if (svg) {
    svgNode = document.createElementNS(SVG_NS, 'svg');
    svgNode.setAttribute('class', 'layer__band');
    svgNode.setAttribute('preserveAspectRatio', 'none');
    svgNode.style.top = `calc(var(--u) * ${top})`;
    svgNode.style.height = `calc(var(--u) * ${bottom - top})`;
    const left = shiftL - overscan;
    const extra = shiftR - shiftL + overscan * 2;
    if (left || extra) {
      svgNode.style.left = `calc(var(--u) * ${left})`;
      svgNode.style.width = `calc(100% + var(--u) * ${extra})`;
    }
    svgNode.innerHTML = svg;
    host.appendChild(svgNode);
  }

  function resize(m) {
    if (!svgNode) return;
    const x0 = shiftL - overscan - m.halfWidth;
    const width = m.halfWidth * 2 + shiftR - shiftL + overscan * 2;
    svgNode.setAttribute('viewBox', `${x0.toFixed(2)} ${top} ${width.toFixed(2)} ${bottom - top}`);
  }

  const offResize = stage.onResize(resize);
  resize(stage.metrics);
  camera?.add(root, depth, depthX);

  return {
    el: root,
    /** Where to append extra children (characters, props). */
    host,
    svg: svgNode,
    depth,
    depthX,
    /** The world-x range this layer must cover, given the screen's half width. */
    coverage: (halfWidth = stage.metrics.halfWidth) => [shiftL - overscan - halfWidth, shiftR + overscan + halfWidth],
    destroy: offResize,
  };
}
