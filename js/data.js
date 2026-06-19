// =============================================================================
// data.js — Données de configuration de la Roue du Destin
//
// Source de vérité : data.json (id, label, poids, valeur?, cle?)
// Les données peuvent être modifiées depuis settings.html et persistées en localStorage.
// Appeler initData() avant tout usage de `data` ou `defaultData`.
// =============================================================================

let data = null;
let defaultData = null;

// Normalise une entrée JSON vers la forme interne attendue par getRandomWeighted et app.js
function normaliseEntry(e) {
    return {
        ...e,
        percentage: e.poids    ?? e.percentage,
        value:      e.valeur   ?? e.value,
        key:        e.cle      ?? e.key,
    };
}

function normaliseData(raw) {
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[k] = v.map(normaliseEntry);
    return out;
}

async function initData() {
    const raw = await fetch('data.json').then(r => r.json());
    defaultData = normaliseData(raw);
    const stored = localStorage.getItem('roue-data');
    data = stored ? JSON.parse(stored) : defaultData;
}

// ── Tirage pondéré ─────────────────────────────────────────────────────────────
/**
 * Tire un élément aléatoire dans un tableau d'options pondérées.
 * Accepte des objets avec `percentage` ou `weight`.
 * @param {Array} items
 * @returns {Object}
 */
function getRandomWeighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.percentage !== undefined ? item.percentage : item.weight), 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
        let w = item.percentage !== undefined ? item.percentage : item.weight;
        if (random < w) return item;
        random -= w;
    }

    return items[items.length - 1]; // fallback arrondi flottant
}
