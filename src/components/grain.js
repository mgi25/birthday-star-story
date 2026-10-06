/**
 * Film grain: a small noise tile generated once, tiled across an oversized
 * layer that CSS jitters in steps (compositor-only, nearly free).
 */
export function installGrain(target, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = Math.random() * 255;
  }
  ctx.putImageData(image, 0, 0);
  target.style.backgroundImage = `url(${canvas.toDataURL('image/png')})`;
}
