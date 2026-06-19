// export.js — Export PNG/JPEG/WebP (canvas 2×) + SVG natif

// ── Dimensions et layout partagés ────────────────────────────────────────────
function _calcHeight(d) {
    let H = 110 + 50 + 50 + 70 + 10 + 30 + 56 * 2 + 60 + 10;
    if (d.isMega)  H += 60;
    if (d.isShiny) H += 34;
    H += 44;
    return H;
}

const _RARETE_COLORS = { Starter: '#10b981', Légendaire: '#f59e0b', Fabuleux: '#8b5cf6', Aucun: '#64748b' };
const _STAT_KEYS = [
    { key: 'hp', label: 'PV' }, { key: 'atk', label: 'ATK' }, { key: 'def', label: 'DEF' },
    { key: 'spa', label: 'ATK.SPE' }, { key: 'spd', label: 'DEF.SPE' }, { key: 'vit', label: 'VIT' },
];
const _DARK_TEXT_TYPES = ['Electrique', 'Normal'];

function _baseStats(d) {
    const s = { ...d.stats };
    if (d.isMega && d.megaBoosts) for (const [k, v] of Object.entries(d.megaBoosts)) s[k] -= v;
    return s;
}

function _download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// ── Export raster (PNG / JPEG / WebP) ────────────────────────────────────────
function exportResultImage(d, format = 'png') {
    if (!d) return;

    const W = 600, SCALE = 2;
    const H = _calcHeight(d);
    const c = document.createElement('canvas');
    c.width = W * SCALE; c.height = H * SCALE;
    const cx = c.getContext('2d');
    cx.scale(SCALE, SCALE);

    // Fond
    const bg = cx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b');
    cx.fillStyle = bg; cx.fillRect(0, 0, W, H);

    function pill(text, x, y, color, textColor = '#fff') {
        cx.font = 'bold 20px Poppins, sans-serif';
        const tw = cx.measureText(text).width;
        const pw = tw + 28, ph = 34;
        cx.beginPath(); cx.roundRect(x - pw / 2, y - ph / 2, pw, ph, ph / 2);
        cx.fillStyle = color; cx.fill();
        cx.fillStyle = textColor; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText(text, x, y);
    }
    function txt(text, x, y, size, color, align = 'left', bold = false) {
        cx.font = `${bold ? 'bold ' : ''}${size}px Poppins, sans-serif`;
        cx.fillStyle = color; cx.textAlign = align; cx.textBaseline = 'middle';
        cx.fillText(text, x, y);
    }
    function sep(y) {
        cx.strokeStyle = '#334155'; cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(40, y); cx.lineTo(W - 40, y); cx.stroke();
    }

    const grad = cx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#f97316');
    cx.font = 'bold 36px Poppins, sans-serif'; cx.fillStyle = grad;
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('Roue du Destin', W / 2, 46);
    txt('Fakemon Généré', W / 2, 76, 15, '#64748b', 'center');
    sep(96);

    pill(d.rarete || 'Aucun', W / 2, 122, _RARETE_COLORS[d.rarete] || '#64748b');

    const hasType2 = d.type2 && d.type2 !== 'Aucun';
    const t1Color = typeColors?.[d.type1] || '#64748b';
    if (hasType2) {
        const t2Color = typeColors?.[d.type2] || '#64748b';
        pill(d.type1, W / 2 - 90, 170, t1Color, _DARK_TEXT_TYPES.includes(d.type1) ? '#1e293b' : '#fff');
        pill(d.type2, W / 2 + 90, 170, t2Color, _DARK_TEXT_TYPES.includes(d.type2) ? '#1e293b' : '#fff');
    } else {
        pill(d.type1, W / 2, 170, t1Color, _DARK_TEXT_TYPES.includes(d.type1) ? '#1e293b' : '#fff');
    }

    txt("Région d'origine", W / 2, 210, 14, '#64748b', 'center');
    txt(d.region || '—', W / 2, 234, 22, '#e2e8f0', 'center', true);
    sep(258);
    txt('STATS DE BASE', W / 2, 278, 13, '#64748b', 'center', true);

    const baseStats = _baseStats(d);
    const bst = _STAT_KEYS.reduce((s, sk) => s + (baseStats[sk.key] || 0), 0);
    const statTop = 294, colW = (W - 80) / 3;
    _STAT_KEYS.forEach((sk, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 40 + col * colW + colW / 2, y = statTop + row * 56;
        cx.fillStyle = '#1e293b';
        cx.beginPath(); cx.roundRect(x - colW / 2 + 4, y, colW - 8, 48, 8); cx.fill();
        txt(sk.label, x, y + 13, 12, '#94a3b8', 'center');
        txt(String(baseStats[sk.key] || 0), x, y + 33, 22, '#f1f5f9', 'center', true);
    });

    const bstY = statTop + 2 * 56 + 8;
    cx.fillStyle = '#1e3a5f';
    cx.beginPath(); cx.roundRect(40, bstY, W - 80, 42, 10); cx.fill();
    txt('Total (BST)', 60, bstY + 21, 15, '#93c5fd', 'left');
    txt(String(bst), W - 60, bstY + 21, 26, '#60a5fa', 'right', true);

    let curY = bstY + 52;
    if (d.isMega || d.isShiny) { sep(curY); curY += 10; }

    if (d.isMega) {
        const megaBST = _STAT_KEYS.reduce((s, sk) => s + (d.stats[sk.key] || 0), 0);
        const megaProfile = Object.entries(d.megaBoosts || {})
            .map(([k, v]) => `${{ hp:'PV',atk:'ATK',def:'DEF',spa:'ATK.SPE',spd:'DEF.SPE',vit:'VIT' }[k]} +${v}`).join('  ·  ');
        txt('⚡ Méga-Évolution  —  ' + megaProfile, W / 2, curY + 16, 15, '#93c5fd', 'center', true);
        txt(`Total Méga : ${megaBST}`, W / 2, curY + 38, 14, '#60a5fa', 'center');
        curY += 60;
    }
    if (d.isShiny) { txt('✨ Version Shiny', W / 2, curY + 16, 20, '#fcd34d', 'center', true); curY += 34; }

    sep(H - 34);
    txt('Roue du Destin Pokémon', W / 2, H - 17, 12, '#334155', 'center');

    const mimeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
    const mime = mimeMap[format] || 'image/png';
    const quality = format === 'png' ? undefined : 0.92;

    c.toBlob(blob => {
        const filename = `fakemon-${Date.now()}.${format}`;
        const file = new File([blob], filename, { type: mime });
        const isMobile = navigator.maxTouchPoints > 0;
        if (isMobile && navigator.canShare?.({ files: [file] })) {
            navigator.share({ files: [file], title: 'Mon Fakemon' }).catch(() => _download(blob, filename));
        } else {
            _download(blob, filename);
        }
    }, mime, quality);
}

// ── Export SVG natif ──────────────────────────────────────────────────────────
function exportResultSVG(d) {
    if (!d) return;

    const W = 600;
    const H = _calcHeight(d);

    // Mesure de texte via canvas temporaire
    const _mc = document.createElement('canvas').getContext('2d');
    function measureText(text, size, bold) {
        _mc.font = `${bold ? 'bold ' : ''}${size}px Poppins, sans-serif`;
        return _mc.measureText(text).width;
    }

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    const els = [];

    function svgRect(x, y, w, h, r, fill) {
        els.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`);
    }
    function svgText(text, x, y, size, fill, anchor = 'middle', bold = false) {
        const weight = bold ? '700' : '400';
        els.push(`<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="central" font-family="'Poppins', sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`);
    }
    function svgLine(y) {
        els.push(`<line x1="40" y1="${y}" x2="${W - 40}" y2="${y}" stroke="#334155" stroke-width="1"/>`);
    }
    function svgPill(text, cx, cy, bgColor, textColor = '#fff') {
        const tw = measureText(text, 20, true);
        const pw = tw + 28, ph = 34;
        svgRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2, bgColor);
        svgText(text, cx, cy, 20, textColor, 'middle', true);
    }

    // En-tête (titre avec gradient via linearGradient)
    svgText('Fakemon Généré', W / 2, 76, 15, '#64748b');
    svgLine(96);

    // Rareté
    svgPill(d.rarete || 'Aucun', W / 2, 122, _RARETE_COLORS[d.rarete] || '#64748b');

    // Types
    const hasType2 = d.type2 && d.type2 !== 'Aucun';
    const t1Color = typeColors?.[d.type1] || '#64748b';
    if (hasType2) {
        const t2Color = typeColors?.[d.type2] || '#64748b';
        svgPill(d.type1, W / 2 - 90, 170, t1Color, _DARK_TEXT_TYPES.includes(d.type1) ? '#1e293b' : '#fff');
        svgPill(d.type2, W / 2 + 90, 170, t2Color, _DARK_TEXT_TYPES.includes(d.type2) ? '#1e293b' : '#fff');
    } else {
        svgPill(d.type1, W / 2, 170, t1Color, _DARK_TEXT_TYPES.includes(d.type1) ? '#1e293b' : '#fff');
    }

    // Région
    svgText("Région d'origine", W / 2, 210, 14, '#64748b');
    svgText(d.region || '—', W / 2, 234, 22, '#e2e8f0', 'middle', true);
    svgLine(258);

    // Stats
    svgText('STATS DE BASE', W / 2, 278, 13, '#64748b', 'middle', true);
    const baseStats = _baseStats(d);
    const bst = _STAT_KEYS.reduce((s, sk) => s + (baseStats[sk.key] || 0), 0);
    const statTop = 294, colW = (W - 80) / 3;
    _STAT_KEYS.forEach((sk, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 40 + col * colW, y = statTop + row * 56;
        svgRect(x + 4, y, colW - 8, 48, 8, '#1e293b');
        svgText(sk.label, x + colW / 2, y + 13, 12, '#94a3b8');
        svgText(String(baseStats[sk.key] || 0), x + colW / 2, y + 33, 22, '#f1f5f9', 'middle', true);
    });

    // BST
    const bstY = statTop + 2 * 56 + 8;
    svgRect(40, bstY, W - 80, 42, 10, '#1e3a5f');
    svgText('Total (BST)', 60, bstY + 21, 15, '#93c5fd', 'start');
    svgText(String(bst), W - 60, bstY + 21, 26, '#60a5fa', 'end', true);

    let curY = bstY + 52;
    if (d.isMega || d.isShiny) { svgLine(curY); curY += 10; }

    if (d.isMega) {
        const megaBST = _STAT_KEYS.reduce((s, sk) => s + (d.stats[sk.key] || 0), 0);
        const megaProfile = Object.entries(d.megaBoosts || {})
            .map(([k, v]) => `${{ hp:'PV',atk:'ATK',def:'DEF',spa:'ATK.SPE',spd:'DEF.SPE',vit:'VIT' }[k]} +${v}`).join('  ·  ');
        svgText('⚡ Méga-Évolution — ' + megaProfile, W / 2, curY + 16, 15, '#93c5fd', 'middle', true);
        svgText(`Total Méga : ${megaBST}`, W / 2, curY + 38, 14, '#60a5fa');
        curY += 60;
    }
    if (d.isShiny) {
        svgText('✨ Version Shiny', W / 2, curY + 16, 20, '#fcd34d', 'middle', true);
        curY += 34;
    }

    svgLine(H - 34);
    svgText('Roue du Destin Pokémon', W / 2, H - 17, 12, '#334155');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;800&amp;display=swap');</style>
    <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="titleG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgG)"/>
  <text x="${W/2}" y="46" text-anchor="middle" dominant-baseline="central" font-family="'Poppins', sans-serif" font-size="36" font-weight="800" fill="url(#titleG)">Roue du Destin</text>
  ${els.join('\n  ')}
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    _download(blob, `fakemon-${Date.now()}.svg`);
}
