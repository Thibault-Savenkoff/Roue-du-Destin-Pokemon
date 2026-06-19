// export.js — Export du résultat en image PNG
// Canvas 2× pour une qualité nette, hauteur calculée selon le contenu.

function exportResultImage(d) {
    if (!d) return;

    const W = 600;
    const SCALE = 2; // rendu 2× pour la netteté

    // ── Calcul de la hauteur nécessaire ──
    let H = 110;            // en-tête + séparateur
    H += 50;                // rareté
    H += 50;                // type(s)
    H += 70;                // région (label + valeur)
    H += 10;                // séparateur
    H += 30;                // titre STATS
    H += 56 * 2;            // grille stats (2 rangées)
    H += 60;                // BST
    H += 10;                // séparateur
    if (d.isMega)   H += 60;
    if (d.isShiny)  H += 34;
    H += 44;                // pied de page

    const c = document.createElement('canvas');
    c.width  = W * SCALE;
    c.height = H * SCALE;
    const cx = c.getContext('2d');
    cx.scale(SCALE, SCALE);

    // ── Fond dégradé ──
    const bg = cx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    cx.fillStyle = bg;
    cx.fillRect(0, 0, W, H);

    // ── Helpers ──
    function pill(text, x, y, color, textColor = '#fff') {
        cx.font = 'bold 20px Poppins, sans-serif';
        const tw = cx.measureText(text).width;
        const pw = tw + 28, ph = 34;
        cx.beginPath();
        cx.roundRect(x - pw / 2, y - ph / 2, pw, ph, ph / 2);
        cx.fillStyle = color;
        cx.fill();
        cx.fillStyle = textColor;
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(text, x, y);
    }

    function txt(text, x, y, size, color, align = 'left', bold = false) {
        cx.font = `${bold ? 'bold ' : ''}${size}px Poppins, sans-serif`;
        cx.fillStyle = color;
        cx.textAlign = align;
        cx.textBaseline = 'middle';
        cx.fillText(text, x, y);
    }

    function sep(y) {
        cx.strokeStyle = '#334155';
        cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(40, y); cx.lineTo(W - 40, y); cx.stroke();
    }

    // ── En-tête ──
    const grad = cx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(1, '#f97316');
    cx.font = 'bold 36px Poppins, sans-serif';
    cx.fillStyle = grad;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('Roue du Destin', W / 2, 46);
    txt('Fakemon Généré', W / 2, 76, 15, '#64748b', 'center');
    sep(96);

    // ── Rareté ──
    const rareteColors = {
        'Starter': '#10b981', 'Légendaire': '#f59e0b',
        'Fabuleux': '#8b5cf6', 'Aucun': '#64748b',
    };
    pill(d.rarete || 'Aucun', W / 2, 122, rareteColors[d.rarete] || '#64748b');

    // ── Types ──
    const hasType2 = d.type2 && d.type2 !== 'Aucun';
    const t1Color  = typeColors?.[d.type1] || '#64748b';
    if (hasType2) {
        const t2Color = typeColors?.[d.type2] || '#64748b';
        pill(d.type1, W / 2 - 90, 170, t1Color, ['Electrique','Normal'].includes(d.type1) ? '#1e293b' : '#fff');
        pill(d.type2, W / 2 + 90, 170, t2Color, ['Electrique','Normal'].includes(d.type2) ? '#1e293b' : '#fff');
    } else {
        pill(d.type1, W / 2, 170, t1Color, ['Electrique','Normal'].includes(d.type1) ? '#1e293b' : '#fff');
    }

    // ── Région ──
    txt('Région d\'origine', W / 2, 210, 14, '#64748b', 'center');
    txt(d.region || '—', W / 2, 234, 22, '#e2e8f0', 'center', true);
    sep(258);

    // ── Stats ──
    txt('STATS DE BASE', W / 2, 278, 13, '#64748b', 'center', true);

    const statKeys = [
        { key: 'hp',  label: 'PV' },
        { key: 'atk', label: 'ATK' },
        { key: 'def', label: 'DEF' },
        { key: 'spa', label: 'ATK.SPE' },
        { key: 'spd', label: 'DEF.SPE' },
        { key: 'vit', label: 'VIT' },
    ];

    const baseStats = { ...d.stats };
    if (d.isMega && d.megaBoosts) {
        for (const [k, v] of Object.entries(d.megaBoosts)) baseStats[k] -= v;
    }
    const bst = statKeys.reduce((s, sk) => s + (baseStats[sk.key] || 0), 0);

    const statTop = 294;
    const colW = (W - 80) / 3;
    statKeys.forEach((sk, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 40 + col * colW + colW / 2;
        const y = statTop + row * 56;
        cx.fillStyle = '#1e293b';
        cx.beginPath(); cx.roundRect(x - colW / 2 + 4, y, colW - 8, 48, 8); cx.fill();
        txt(sk.label, x, y + 13, 12, '#94a3b8', 'center');
        txt(String(baseStats[sk.key] || 0), x, y + 33, 22, '#f1f5f9', 'center', true);
    });

    // ── BST ──
    const bstY = statTop + 2 * 56 + 8;
    cx.fillStyle = '#1e3a5f';
    cx.beginPath(); cx.roundRect(40, bstY, W - 80, 42, 10); cx.fill();
    txt('Total (BST)', 60, bstY + 21, 15, '#93c5fd', 'left');
    txt(String(bst), W - 60, bstY + 21, 26, '#60a5fa', 'right', true);

    let curY = bstY + 52;

    // Séparateur intermédiaire uniquement s'il y a du contenu Méga ou Shiny
    if (d.isMega || d.isShiny) {
        sep(curY);
        curY += 10;
    }

    // ── Méga ──
    if (d.isMega) {
        const megaBST = statKeys.reduce((s, sk) => s + (d.stats[sk.key] || 0), 0);
        const megaProfile = Object.entries(d.megaBoosts || {})
            .map(([k, v]) => `${({ hp:'PV',atk:'ATK',def:'DEF',spa:'ATK.SPE',spd:'DEF.SPE',vit:'VIT' }[k])} +${v}`)
            .join('  ·  ');
        txt('⚡ Méga-Évolution  —  ' + megaProfile, W / 2, curY + 16, 15, '#93c5fd', 'center', true);
        txt(`Total Méga : ${megaBST}`, W / 2, curY + 38, 14, '#60a5fa', 'center');
        curY += 60;
    }

    // ── Shiny ──
    if (d.isShiny) {
        txt('✨ Version Shiny', W / 2, curY + 16, 20, '#fcd34d', 'center', true);
        curY += 34;
    }

    // ── Pied de page ──
    sep(H - 34);
    txt('Roue du Destin Pokémon', W / 2, H - 17, 12, '#334155', 'center');

    // ── Export ──
    c.toBlob(blob => {
        const file = new File([blob], `fakemon-${Date.now()}.png`, { type: 'image/png' });
        const isMobile = navigator.maxTouchPoints > 0;
        if (isMobile && navigator.canShare?.({ files: [file] })) {
            navigator.share({ files: [file], title: 'Mon Fakemon' }).catch(() => _download(blob));
        } else {
            _download(blob);
        }
    }, 'image/png');

    function _download(blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fakemon-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
}
