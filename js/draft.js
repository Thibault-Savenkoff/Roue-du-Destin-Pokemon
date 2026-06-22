// draft.js — Mode draft multi-joueurs
// Chaque étape tourne pour TOUS les joueurs avant de passer à la suivante.
// Le mode (auto/manuel/rapide) reste contrôlable via les boutons pendant le draft.

let draftActive = false;
let draftPlayers = [];
let draftResults = [];
let draftUsedCombos = new Set();

function draftComboKey(t1, t2) {
    if (!t2 || t2 === 'Aucun') return t1;
    return [t1, t2].sort().join('+');
}

function getPlayerNames() {
    const count = parseInt(document.getElementById('draft-count').value) || 2;
    const names = [];
    for (let i = 0; i < count; i++) {
        const input = document.getElementById(`draft-name-${i}`);
        names.push(input && input.value.trim() ? input.value.trim() : `Joueur ${i + 1}`);
    }
    return names;
}

function renderNameInputs() {
    const count = Math.min(8, Math.max(2, parseInt(document.getElementById('draft-count').value) || 2));
    const container = document.getElementById('draft-names-inputs');
    const existing = Array.from(container.querySelectorAll('input')).map(el => el.value);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';
        row.innerHTML = `
            <span class="text-slate-400 text-sm w-5 text-right">${i + 1}.</span>
            <input id="draft-name-${i}" type="text" placeholder="Joueur ${i + 1}"
                   value="${existing[i] || ''}"
                   class="flex-1 bg-slate-900 text-white rounded border border-slate-600 px-2 py-1 text-sm">
        `;
        container.appendChild(row);
    }
}

function showTurnIndicator(i) {
    document.getElementById('draft-turn-indicator').classList.remove('hidden');
    document.getElementById('draft-player-name').textContent = draftPlayers[i].name;
    document.getElementById('draft-progress-text').textContent =
        `Joueur ${i + 1} sur ${draftPlayers.length}`;
}

function startDraft(playerNames) {
    window._h?.trigger('medium');
    draftPlayers = playerNames.map(name => ({ name }));
    draftResults = [];
    draftUsedCombos = new Set();
    draftActive = true;

    document.getElementById('draft-setup').classList.add('hidden');
    document.getElementById('draft-results').classList.add('hidden');
    document.getElementById('btn-rejouer')?.classList.add('hidden');

    lanceDraftDestinee();
}

async function lanceDraftDestinee() {
    if (isSequenceRunning || isAnimating) return;
    isSequenceRunning = true;
    currentMode = currentMode || 'auto'; // conserve le mode actif

    const n = draftPlayers.length;
    const finals = draftPlayers.map(() => ({ stats: {} }));

    summaryList.innerHTML = '';
    resultsDisplay.classList.add('hidden');
    outputSection.classList.add('hidden');
    progression.classList.remove('hidden');
    if (progressionBar) progressionBar.style.width = '0%';
    updateModeButtons(currentMode);

    try {
        // ── Rareté ──
        for (let i = 0; i < n; i++) {
            showTurnIndicator(i);
            await waitManualClick();
            const r = await spinWheel(`${draftPlayers[i].name} — Rareté`, data.rarete);
            finals[i].rarete = r.label;
            if (shouldPause()) await pause(PAUSE_DURATION);
        }

        // ── Région ──
        for (let i = 0; i < n; i++) {
            showTurnIndicator(i);
            await waitManualClick();
            const r = await spinWheel(`${draftPlayers[i].name} — Région`, data.regions);
            finals[i].region = r.label;
            if (shouldPause()) await pause(PAUSE_DURATION);
        }

        // ── Double Type ? ──
        for (let i = 0; i < n; i++) {
            showTurnIndicator(i);
            await waitManualClick();
            const r = await spinWheel(`${draftPlayers[i].name} — Double Type ?`, data.doubleType);
            finals[i].isDouble = r.label === 'Oui';
            if (shouldPause()) await pause(PAUSE_DURATION);
        }

        // ── Types (avec dédup draft) ──
        for (let i = 0; i < n; i++) {
            showTurnIndicator(i);
            await waitManualClick();
            const t1 = await spinWheel(`${draftPlayers[i].name} — Type Principal`, data.types, true);
            finals[i].type1 = t1.label;

            if (finals[i].isDouble) {
                if (shouldPause()) await pause(PAUSE_DURATION);
                await waitManualClick();
                const opts2 = data.types.filter(t => t.label !== finals[i].type1);
                const t2 = await spinWheel(`${draftPlayers[i].name} — Type Secondaire`, opts2, true);
                finals[i].type2 = t2.label;
            } else {
                finals[i].type2 = 'Aucun';
            }

            // Re-spin si combo déjà attribué
            let comboKey = draftComboKey(finals[i].type1, finals[i].type2);
            while (draftUsedCombos.has(comboKey)) {
                await pause(800);
                const t1r = await spinWheel(`${draftPlayers[i].name} — Type ↺`, data.types, true);
                finals[i].type1 = t1r.label;
                if (finals[i].isDouble) {
                    const opts = data.types.filter(t => t.label !== finals[i].type1);
                    const t2r = await spinWheel(`${draftPlayers[i].name} — Type Sec. ↺`, opts, true);
                    finals[i].type2 = t2r.label;
                }
                comboKey = draftComboKey(finals[i].type1, finals[i].type2);
            }
            draftUsedCombos.add(comboKey);
            if (shouldPause()) await pause(PAUSE_DURATION);
        }

        // ── Stats (6 stats × N joueurs) ──
        for (const stat of data.statsNames) {
            for (let i = 0; i < n; i++) {
                showTurnIndicator(i);
                await waitManualClick();
                const s = await spinWheel(`${draftPlayers[i].name} — ${stat.label}`, data.statsValues);
                finals[i].stats[stat.key] = s.value;
                if (shouldPause()) await pause(1000);
            }
        }

        // ── Bonus Starter (par joueur, conditionnel) ──
        for (let i = 0; i < n; i++) {
            if (finals[i].rarete !== 'Starter') continue;
            showTurnIndicator(i);
            let pool = data.statsNames.map(s => ({ ...s }));
            for (let b = 1; b <= 3; b++) {
                await waitManualClick();
                const ps = await spinWheel(`${draftPlayers[i].name} — Starter Boost ${b}`, pool);
                finals[i].stats[ps.key] += 10;
                const idx = pool.findIndex(s => s.key === ps.key);
                if (idx !== -1) pool[idx] = { ...pool[idx], percentage: 0, grayed: true };
                if (shouldPause()) await pause(PAUSE_DURATION);
            }
        }

        // ── Bonus Légendaire / Fabuleux (par joueur, conditionnel) ──
        for (let i = 0; i < n; i++) {
            const rl = finals[i].rarete;
            if (rl !== 'Légendaire' && rl !== 'Fabuleux') continue;
            showTurnIndicator(i);
            const valPool = rl === 'Fabuleux' ? data.statsValues.filter(v => v.value >= 60) : data.statsValues;
            let usedKey = null;
            for (let b = 1; b <= 2; b++) {
                await waitManualClick();
                const sPool = b === 1 ? data.statsNames
                    : data.statsNames.map(s => s.key === usedKey ? { ...s, percentage: 0, grayed: true } : { ...s });
                const sn = await spinWheel(`${draftPlayers[i].name} — ${rl} Stat ${b}`, sPool);
                usedKey = sn.key;
                if (shouldPause()) await pause(PAUSE_DURATION);
                await waitManualClick();
                const sv = await spinWheel(`${draftPlayers[i].name} — Boost (${sn.label})`, valPool);
                finals[i].stats[sn.key] += sv.value;
                if (shouldPause()) await pause(PAUSE_DURATION);
            }
        }

        // ── Méga ──
        for (let i = 0; i < n; i++) {
            showTurnIndicator(i);
            await waitManualClick();
            const m = await spinWheel(`${draftPlayers[i].name} — Méga ?`, data.mega);
            finals[i].isMega = m.label === 'Oui';
            if (shouldPause()) await pause(PAUSE_DURATION);
        }

        // ── Boosts Méga (par joueur, conditionnel) ──
        for (let i = 0; i < n; i++) {
            if (!finals[i].isMega) continue;
            showTurnIndicator(i);
            finals[i].megaBoosts = {};
            const megaPool = data.statsNames.filter(s => s.key !== 'hp');

            await waitManualClick();
            const b1 = await spinWheel(`${draftPlayers[i].name} — Méga Stat 1`, megaPool);
            if (shouldPause()) await pause(PAUSE_DURATION);
            await waitManualClick();
            const v1 = await spinWheel(`${draftPlayers[i].name} — Boost (${b1.label})`, data.statsValues);
            finals[i].stats[b1.key] += v1.value;
            finals[i].megaBoosts[b1.key] = v1.value;
            if (shouldPause()) await pause(PAUSE_DURATION);

            const pool2 = megaPool.map(s => s.key === b1.key ? { ...s, percentage: 0, grayed: true } : { ...s });
            await waitManualClick();
            const b2 = await spinWheel(`${draftPlayers[i].name} — Méga Stat 2`, pool2);
            if (shouldPause()) await pause(PAUSE_DURATION);
            await waitManualClick();
            const v2 = await spinWheel(`${draftPlayers[i].name} — Boost (${b2.label})`, data.statsValues);
            finals[i].stats[b2.key] += v2.value;
            finals[i].megaBoosts[b2.key] = v2.value;
            if (shouldPause()) await pause(PAUSE_DURATION);
        }

        // ── Shiny ──
        for (let i = 0; i < n; i++) {
            showTurnIndicator(i);
            await waitManualClick();
            const s = await spinWheel(`${draftPlayers[i].name} — Shiny ?`, data.shiny);
            finals[i].isShiny = s.label === 'Oui';
            if (finals[i].isShiny) playShiny();
            if (shouldPause()) await pause(PAUSE_DURATION);
        }

        // ── Fin ──
        draftResults = draftPlayers.map((p, i) => ({ playerName: p.name, finalData: finals[i] }));
        draftActive = false;
        titleElem.textContent = 'Draft Terminé !';
        playFanfare();
        window._h?.trigger('success');
        renderDraftResults();
        document.getElementById('draft-results').classList.remove('hidden');

    } catch (e) {
        console.error(e);
        draftActive = false;
        titleElem.textContent = 'Erreur de draft';
    } finally {
        isSequenceRunning = false;
        document.getElementById('draft-turn-indicator').classList.add('hidden');
        progression.classList.add('hidden');
        updateModeButtons(null);
    }
}

function renderDraftResults() {
    const list = document.getElementById('draft-results-list');
    list.innerHTML = '';
    draftResults.forEach((r, i) => {
        const d = r.finalData;
        const bst = Object.values(d.stats || {}).reduce((s, v) => s + (Number(v) || 0), 0);
        const type2part = d.type2 && d.type2 !== 'Aucun' ? ` / ${d.type2}` : '';
        const badges = [
            d.isMega  ? '<span class="bg-blue-900 text-blue-300 text-xs px-2 py-0.5 rounded-full">⚡ Méga</span>'  : '',
            d.isShiny ? '<span class="bg-yellow-900 text-yellow-300 text-xs px-2 py-0.5 rounded-full">✨ Shiny</span>' : '',
        ].filter(Boolean).join(' ');
        const card = document.createElement('div');
        card.className = 'bg-slate-800 rounded-xl border border-slate-700 p-3';
        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div>
                    <p class="font-bold text-white">${i + 1}. ${r.playerName}</p>
                    <p class="text-sm text-slate-300 mt-0.5">${d.rarete} · ${d.type1}${type2part}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${d.region} · BST ${bst}</p>
                </div>
                <div class="flex flex-col gap-1 items-end shrink-0">${badges}</div>
            </div>
        `;
        list.appendChild(card);
    });

    // Bouton de partage
    const shareBtn = document.getElementById('btn-draft-share');
    if (shareBtn) shareBtn.classList.remove('hidden');
}

function shareDraftResults() {
    if (!draftResults.length) return;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(draftResults))));
    const url = `${location.origin}${location.pathname}?draft=${encoded}`;
    const btn = document.getElementById('btn-draft-share');
    const showFeedback = (ok) => {
        if (!btn) return;
        const orig = btn.textContent;
        btn.textContent = ok ? '✅ Lien copié !' : '❌ Erreur';
        setTimeout(() => { btn.textContent = orig; }, 2500);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => { window._h?.trigger('light'); showFeedback(true); }).catch(() => showFeedback(false));
    else {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        showFeedback(true);
    }
}

// Lecture auto des résultats partagés via URL ?draft=…
(function loadSharedDraft() {
    const param = new URLSearchParams(location.search).get('draft');
    if (!param) return;
    try {
        const results = JSON.parse(decodeURIComponent(escape(atob(param))));
        // Affiche les résultats une fois le DOM prêt
        window.addEventListener('DOMContentLoaded', () => {
            draftResults = results;
            const list = document.getElementById('draft-results-list');
            const section = document.getElementById('draft-results');
            if (!list || !section) return;
            renderDraftResults();
            section.classList.remove('hidden');
            const banner = document.createElement('p');
            banner.className = 'text-center text-xs text-slate-500 mb-2';
            banner.textContent = '👁 Résultats de draft partagés — lecture seule';
            section.prepend(banner);
        }, { once: true });
    } catch { /* URL invalide, on ignore */ }
})();

// === Bindings ===
(function () {
    const btnToggle     = document.getElementById('btn-draft-toggle');
    const draftSetup    = document.getElementById('draft-setup');
    const draftCount    = document.getElementById('draft-count');
    const btnStart      = document.getElementById('btn-draft-start');
    const btnDraftReset = document.getElementById('btn-draft-reset');

    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            if (draftActive) return; // pas d'ouverture du panneau pendant un draft en cours
            const nowHidden = draftSetup.classList.toggle('hidden');
            if (!nowHidden) renderNameInputs();
        });
    }

    if (draftCount) draftCount.addEventListener('change', renderNameInputs);

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            const names = getPlayerNames();
            if (names.length >= 2) startDraft(names);
        });
    }

    if (btnDraftReset) {
        btnDraftReset.addEventListener('click', () => {
            draftActive = false;
            document.getElementById('draft-results').classList.add('hidden');
            document.getElementById('draft-turn-indicator').classList.add('hidden');
            draftSetup.classList.remove('hidden');
            renderNameInputs();
        });
    }

    renderNameInputs();
})();
