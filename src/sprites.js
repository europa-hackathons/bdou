// Kawaii sushi characters as inline SVG, rasterised once to images.
function kawaiiFace(cx, cy, s = 1) {
  const eye = x => `<ellipse cx="${cx + x * s}" cy="${cy}" rx="${3.8 * s}" ry="${4.6 * s}" fill="#3b2a4a"/><circle cx="${cx + x * s - 1.2 * s}" cy="${cy - 1.8 * s}" r="${1.5 * s}" fill="#fff"/>`;
  const cheek = x => `<ellipse cx="${cx + x * s}" cy="${cy + 7 * s}" rx="${5 * s}" ry="${3.2 * s}" fill="#ff5f95" opacity=".65"/>`;
  return eye(-10) + eye(10) + cheek(-17) + cheek(17) +
    `<path d="M${cx - 4 * s} ${cy + 5 * s}Q${cx} ${cy + 10.5 * s} ${cx + 4 * s} ${cy + 5 * s}" stroke="#3b2a4a" stroke-width="${2 * s}" fill="none" stroke-linecap="round"/>`;
}
const sparkleSvg = (x, y, r, c = '#fff') => `<path d="M${x} ${y - r}L${x + r * .28} ${y - r * .28}L${x + r} ${y}L${x + r * .28} ${y + r * .28}L${x} ${y + r}L${x - r * .28} ${y + r * .28}L${x - r} ${y}L${x - r * .28} ${y - r * .28}Z" fill="${c}"/>`;
const seeds = [0, 45, 90, 135, 180, 225, 270, 315].map(a => {
  const r = a * Math.PI / 180, x = 60 + Math.cos(r) * 38, y = 62 + Math.sin(r) * 38;
  return `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.5" fill="#bdb6a8" transform="rotate(${a} ${x} ${y})"/>`;
}).join('');

const BODY = {
  maki: `<circle cx="60" cy="62" r="52" fill="#2b2d42"/><circle cx="60" cy="62" r="44" fill="#fffdf7"/><circle cx="60" cy="62" r="31" fill="#ff8a65"/><circle cx="60" cy="62" r="31" fill="none" stroke="#ff6f4a" stroke-width="3"/>`,
  avo: `<circle cx="60" cy="62" r="52" fill="#2b2d42"/><circle cx="60" cy="62" r="44" fill="#fffdf7"/>${seeds}<circle cx="60" cy="62" r="31" fill="#4caf50"/><circle cx="60" cy="62" r="25" fill="#c8ea6e"/>`,
  sashimi: `<rect x="14" y="62" width="92" height="44" rx="18" fill="#fffdf7" stroke="#e6dcf2" stroke-width="3"/><rect x="8" y="26" width="104" height="58" rx="28" fill="#ff8a65"/><path d="M22 40Q60 30 98 40" stroke="#ffd0bd" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/><path d="M26 74Q60 82 94 74" stroke="#ff6f4a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`
};

// extra characters for the intros
BODY.tamago = `<rect x="14" y="66" width="92" height="40" rx="16" fill="#fffdf7" stroke="#e6dcf2" stroke-width="3"/><rect x="8" y="26" width="104" height="52" rx="16" fill="#ffd84d" stroke="#f2b705" stroke-width="3"/><path d="M18 40Q60 32 102 40" stroke="#fff3b0" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 70H40M80 70H98" stroke="#e0a800" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
BODY.onigiri = `<path d="M60 10C74 10 110 68 110 88C110 105 96 112 60 112C24 112 10 105 10 88C10 68 46 10 60 10Z" fill="#fffdf7" stroke="#e6dcf2" stroke-width="3"/><rect x="36" y="80" width="48" height="32" rx="5" fill="#2b2d42"/><ellipse cx="44" cy="40" rx="2.4" ry="1.4" fill="#d8cfbd"/><ellipse cx="78" cy="46" rx="2.4" ry="1.4" fill="#d8cfbd"/><ellipse cx="62" cy="30" rx="2.4" ry="1.4" fill="#d8cfbd"/>`;

// where each character's face sits (in the 120×120 sprite), the sparkle, and anime details
export const FACE_POS = { maki: [60, 62], avo: [60, 62], sashimi: [60, 54], tamago: [60, 54], onigiri: [60, 60] };
const SPARKLE = { maki: [100, 22], avo: [100, 22], sashimi: [104, 16], tamago: [104, 16], onigiri: [102, 20] };
export const ANIME_LOOK = {
  maki: { iris: '#e8553a', jp: '巻きちゃん' },
  sashimi: { iris: '#ff6a3d', jp: '刺身くん' },
  avo: { iris: '#2f9e44', jp: 'アボさん' },
  tamago: { iris: '#d99a00', jp: 'たまごちゃん' },
  onigiri: { iris: '#4f5bd5', jp: 'おにぎりくん' }
};

const svgImage = inner => { const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">${inner}</svg>`); return img; };
export const SPRITES = {};       // kawaii look: body + face + sparkle
export const SPRITES_BARE = {};  // body only, for the anime look (eyes drawn separately)
for (const k in BODY) {
  SPRITES[k] = svgImage(BODY[k] + kawaiiFace(...FACE_POS[k]) + sparkleSvg(...SPARKLE[k], 9));
  SPRITES_BARE[k] = svgImage(BODY[k]);
}

export const BOX_STYLE = {
  maki: { color: '#ff6fb5', dark: '#c4287f', badge: '●' },
  sashimi: { color: '#ffa24d', dark: '#c26a12', badge: '▲' },
  avo: { color: '#5fd16a', dark: '#2b8a36', badge: '■' }
};
