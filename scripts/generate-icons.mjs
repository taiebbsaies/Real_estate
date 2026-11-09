// Generates every app icon from the logo geometry. Usage: node scripts/generate-icons.mjs
import fs from "node:fs/promises";
import sharp from "sharp";

const NAVY = "#14213D";
const GOLD_ON_LIGHT = "#C9973B";
const GOLD_ON_DARK = "#E0AE55";

const mark = (stroke, door) => `
  <path d="M5 52 58 6l53 46M23 42v53h70V42" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M47 92V71a11 11 0 0 1 22 0v21z" fill="${door}"/>`;

/** The mark centred on a square navy background. `scale` is the share of the width it occupies. */
function appIcon(size, scale) {
  const width = size * scale;
  const ratio = width / 116;
  const x = (size - width) / 2;
  const y = (size - 100 * ratio) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${NAVY}"/>
  <g transform="translate(${x} ${y}) scale(${ratio})">${mark("#FFFFFF", GOLD_ON_DARK)}</g>
</svg>`;
}

const toPng = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

// Browser tab icon: it follows the browser's light or dark mode.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -12 124 124">
  <style>
    .house { stroke: ${NAVY}; }
    .door { fill: ${GOLD_ON_LIGHT}; }
    @media (prefers-color-scheme: dark) {
      .house { stroke: #FFFFFF; }
      .door { fill: ${GOLD_ON_DARK}; }
    }
  </style>
  <path class="house" d="M5 52 58 6l53 46M23 42v53h70V42" fill="none" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="door" d="M47 92V71a11 11 0 0 1 22 0v21z"/>
</svg>
`;
await fs.writeFile("public/icons/favicon.svg", favicon);

// Fallback for browsers without SVG favicons: an ICO file wrapping one PNG image.
const png48 = await toPng(appIcon(48, 0.74));
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(48, 6);
header.writeUInt8(48, 7);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png48.length, 14);
header.writeUInt32LE(22, 18);
await fs.writeFile("app/favicon.ico", Buffer.concat([header, png48]));

// Maskable icons keep the mark inside the safe zone, because launchers crop them into various shapes.
const outputs = [
  ["icon-192x192.png", 192, 0.68],
  ["icon-512x512.png", 512, 0.68],
  ["icon-192x192-maskable.png", 192, 0.56],
  ["icon-512x512-maskable.png", 512, 0.56],
  ["apple-touch-icon.png", 180, 0.66],
];
for (const [name, size, scale] of outputs) {
  await fs.writeFile(`public/icons/${name}`, await toPng(appIcon(size, scale)));
}
for (const size of [192, 512]) {
  await fs.writeFile(`public/icons/icon-${size}x${size}.svg`, appIcon(size, 0.68));
}

console.log("Icons generated.");
