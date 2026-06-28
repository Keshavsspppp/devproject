/**
 * Global interaction effects — no dependencies, ~50 lines.
 *
 * 1. Spotlight (Vengeance UI): a coloured radial gradient follows
 *    the cursor inside every .card element. CSS reads --mx/--my.
 *
 * 2. 3D tilt (Animmaster): elements with class .tilt subtly rotate
 *    in perspective as the cursor moves across them.
 */

// ── Spotlight ────────────────────────────────────────────────────
let spotlightCard = null;

function onSpotlightMove(e) {
  const card = e.target.closest?.('.card');
  if (card !== spotlightCard) {
    if (spotlightCard) {
      spotlightCard.style.removeProperty('--mx');
      spotlightCard.style.removeProperty('--my');
    }
    spotlightCard = card;
  }
  if (card) {
    const { left, top } = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - left}px`);
    card.style.setProperty('--my', `${e.clientY - top}px`);
  }
}

function onSpotlightLeave() {
  if (spotlightCard) {
    spotlightCard.style.removeProperty('--mx');
    spotlightCard.style.removeProperty('--my');
    spotlightCard = null;
  }
}

// ── 3D tilt ──────────────────────────────────────────────────────
let tiltEl = null;

function onTiltMove(e) {
  const el = e.target.closest?.('.tilt');
  if (!el) {
    if (tiltEl) { tiltEl.style.transform = ''; tiltEl = null; }
    return;
  }
  tiltEl = el;
  const { left, top, width, height } = el.getBoundingClientRect();
  const x = (e.clientX - left) / width  - 0.5;
  const y = (e.clientY - top)  / height - 0.5;
  el.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 5}deg) scale3d(1.01,1.01,1.01)`;
  el.style.transition = 'transform 0.08s ease';
}

function onTiltLeave() {
  if (tiltEl) {
    tiltEl.style.transform = '';
    tiltEl.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
    tiltEl = null;
  }
}

// ── Register ─────────────────────────────────────────────────────
document.addEventListener('mousemove', onSpotlightMove, { passive: true });
document.addEventListener('mouseleave', onSpotlightLeave, { passive: true });
document.addEventListener('mousemove', onTiltMove, { passive: true });
document.addEventListener('mouseleave', onTiltLeave, { passive: true });
