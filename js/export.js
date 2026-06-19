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
    <style>@font-face{font-family:'Poppins';font-style:normal;font-weight:400;src:url('data:font/woff2;base64,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') format('woff2')}@font-face{font-family:'Poppins';font-style:normal;font-weight:700;src:url('data:font/woff2;base64,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') format('woff2')}@font-face{font-family:'Poppins';font-style:normal;font-weight:800;src:url('data:font/woff2;base64,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') format('woff2')}</style>
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
