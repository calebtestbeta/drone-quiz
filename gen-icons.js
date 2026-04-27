const sharp = require('sharp');

// Propeller centers at offset ±108 from 256 → (148,148),(364,148),(148,364),(364,364)
// Outermost point from center ≈ 199px < 204.8px safe-zone radius (512×0.4) ✓
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="40%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#080f1f"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="propGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <filter id="softBlur">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- Center glow -->
  <circle cx="256" cy="256" r="210" fill="url(#glow)"/>

  <!-- Propeller halo glow (blurred) -->
  <g filter="url(#softBlur)" opacity="0.5">
    <circle cx="148" cy="148" r="52" fill="#3b82f6"/>
    <circle cx="364" cy="148" r="52" fill="#3b82f6"/>
    <circle cx="148" cy="364" r="52" fill="#3b82f6"/>
    <circle cx="364" cy="364" r="52" fill="#3b82f6"/>
  </g>

  <!-- Arms -->
  <g stroke="#2563eb" stroke-width="20" stroke-linecap="round">
    <line x1="256" y1="256" x2="148" y2="148"/>
    <line x1="256" y1="256" x2="364" y2="148"/>
    <line x1="256" y1="256" x2="148" y2="364"/>
    <line x1="256" y1="256" x2="364" y2="364"/>
  </g>

  <!-- Propeller rings -->
  <g fill="none" stroke="#60a5fa" stroke-width="5" opacity="0.9">
    <circle cx="148" cy="148" r="46"/>
    <circle cx="364" cy="148" r="46"/>
    <circle cx="148" cy="364" r="46"/>
    <circle cx="364" cy="364" r="46"/>
  </g>

  <!-- Spinning blades (cross ellipses) -->
  <g fill="#bfdbfe" opacity="0.45">
    <ellipse cx="148" cy="148" rx="38" ry="10"/>
    <ellipse cx="148" cy="148" rx="10" ry="38"/>
    <ellipse cx="364" cy="148" rx="38" ry="10"/>
    <ellipse cx="364" cy="148" rx="10" ry="38"/>
    <ellipse cx="148" cy="364" rx="38" ry="10"/>
    <ellipse cx="148" cy="364" rx="10" ry="38"/>
    <ellipse cx="364" cy="364" rx="38" ry="10"/>
    <ellipse cx="364" cy="364" rx="10" ry="38"/>
  </g>

  <!-- Motor hubs -->
  <g>
    <circle cx="148" cy="148" r="13" fill="#1d4ed8"/>
    <circle cx="148" cy="148" r="6"  fill="#93c5fd"/>
    <circle cx="364" cy="148" r="13" fill="#1d4ed8"/>
    <circle cx="364" cy="148" r="6"  fill="#93c5fd"/>
    <circle cx="148" cy="364" r="13" fill="#1d4ed8"/>
    <circle cx="148" cy="364" r="6"  fill="#93c5fd"/>
    <circle cx="364" cy="364" r="13" fill="#1d4ed8"/>
    <circle cx="364" cy="364" r="6"  fill="#93c5fd"/>
  </g>

  <!-- Central body -->
  <rect x="218" y="218" width="76" height="76" rx="16" fill="#172554"/>
  <rect x="224" y="224" width="64" height="64" rx="13" fill="url(#bodyGrad)"/>

  <!-- Camera lens -->
  <circle cx="256" cy="256" r="15" fill="#0f172a"/>
  <circle cx="256" cy="256" r="9"  fill="#60a5fa" opacity="0.95"/>
  <circle cx="251" cy="251" r="2.5" fill="white" opacity="0.7"/>
</svg>`;

async function main() {
  const buf = Buffer.from(svg);

  await sharp(buf).resize(192, 192).png().toFile('icons/icon-192.png');
  console.log('✓ icon-192.png');

  await sharp(buf).resize(512, 512).png().toFile('icons/icon-512.png');
  console.log('✓ icon-512.png');

  await sharp(buf).resize(512, 512).png().toFile('icons/icon-maskable.png');
  console.log('✓ icon-maskable.png');
}

main().catch(console.error);
