// =============================================================================
// app.js — Logique principale de la Roue du Destin
// Gère le rendu canvas de la roue, les animations de spin, les 3 modes de jeu
// (auto, rapide, manuel), et la génération des outputs finaux (prompt + CSV).
// Dépend de data.js pour les tableaux de probabilités.
// =============================================================================

import { data, getRandomWeighted } from './data.js';

// ── Références aux éléments du DOM ──────────────────────────────────────────
const btnGenerer    = document.getElementById('btn-generer');     // Bouton principal "AUTO"
const titleElem     = document.getElementById('roue-title');      // Titre affiché au-dessus de la roue
const progression   = document.getElementById('progression');     // Indicateur "Étape X sur ~Y"
const resultsDisplay = document.getElementById('results-display'); // Section récapitulatif
const summaryList   = document.getElementById('summary-list');    // <ul> du récapitulatif
const outputSection = document.getElementById('output-section'); // Section prompt + CSV
const promptOutput  = document.getElementById('prompt-output');  // Textarea du prompt ChatGPT
const csvOutput     = document.getElementById('csv-output');     // Textarea des données CSV
const winnerDisplay = document.getElementById('winner-display'); // Affiche le résultat en haut

// ── Config Canvas ────────────────────────────────────────────────────────────
const wheelCanvas = document.getElementById('wheel-canvas'); // L'élément <canvas> de la roue
const ctx = wheelCanvas.getContext('2d'); // Contexte 2D pour dessiner dessus

let currentRotation = 0;    // Angle de rotation cumulé (en degrés) — ne se reset jamais pour
                              // que la roue reparte de sa position actuelle à chaque spin
let isAnimating = false;     // Verrou : empêche de relancer un spin pendant qu'un est en cours
let currentMode = 'auto';    // Mode actif : 'auto' | 'rapide' | 'manuel'
let manualResolve = null;    // Stocke la fonction resolve() d'une Promise en attente d'un clic
                              // (utilisé uniquement en mode manuel pour "débloquer" l'étape suivante)

/**
 * Vibration helper using la Web Vibration API native du navigateur.
 * Ne fait rien si l'API n'est pas supportée.
 * @param {number|Array<number>} pattern
 */
function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

// ── Gestion du clic sur le canvas (mode manuel) ──────────────────────────────
// En mode manuel, l'utilisateur doit cliquer sur la roue pour déclencher chaque spin.
wheelCanvas.addEventListener('click', () => {
    // Cas 1 : on n'est pas en mode manuel → on lance tout le processus en mode manuel
    if (currentMode !== 'manuel' && !isAnimating && !btnGenerer.disabled) {
        lanceDestinee('manuel');
    }
    // Cas 2 : on est déjà en mode manuel ET on attend un clic pour démarrer le prochain spin
    else if (currentMode === 'manuel' && manualResolve && !isAnimating) {
        manualResolve();       // Résout la Promise en attente → le spin suivant démarre
        manualResolve = null;  // Libère la référence
        document.getElementById('center-circle').textContent = "Spin"; // Remet le label du bouton
    }
});

/**
 * Retourne une Promise qui se résout uniquement quand l'utilisateur clique sur la roue.
 * En mode non-manuel, se résout immédiatement (pas d'attente).
 * Utilisé avant chaque spin pour mettre le flux en pause en mode manuel.
 */
function waitManualClick() {
    if (currentMode !== 'manuel') return Promise.resolve(); // Rien à attendre en auto/rapide
    return new Promise(resolve => {
        manualResolve = resolve; // La résolution sera déclenchée par le click listener ci-dessus
        titleElem.textContent = "Cliquez sur la roue";
        document.getElementById('center-circle').textContent = "Tap"; // Indique à l'utilisateur qu'il doit agir
    });
}

// ── Timings d'animation ──────────────────────────────────────────────────────
let PAUSE_DURATION = 2500; // Durée de la pause APRÈS chaque spin (ms) — laisse le temps de lire le résultat
let SPIN_DURATION  = 4000; // Durée de l'animation de spin elle-même (ms)

// ── Palette de couleurs ───────────────────────────────────────────────────────
// Couleurs génériques pour les roues non-typées (rareté, stats, etc.)
const defaultColors = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#FCD34D', '#9CA3AF'];

// Couleurs officielles des types Pokémon (reprises depuis les jeux)
const typeColors = {
    'Feu': '#F08030', 'Eau': '#6890F0', 'Plante': '#78C850', 'Electrique': '#F8D030',
    'Glace': '#98D8D8', 'Combat': '#C03028', 'Poison': '#A040A0', 'Sol': '#E0C068',
    'Vol': '#A890F0', 'Psy': '#F85888', 'Insecte': '#A8B820', 'Roche': '#B8A038',
    'Spectre': '#705898', 'Dragon': '#7038F8', 'Ténèbres': '#705848', 'Acier': '#B8B8D0',
    'Fée': '#EE99AC', 'Normal': '#A8A878'
};

/**
 * Retourne la couleur à utiliser pour une tranche donnée.
 * @param {string}  label   - Le texte de la tranche (ex : "Feu", "Starter"...)
 * @param {boolean} isType  - true si on est sur la roue des types
 * @param {number}  index   - Index de la tranche (pour piocher dans defaultColors en fallback)
 */
function getColor(label, isType, index) {
    if (isType && typeColors[label]) return typeColors[label]; // Couleur spécifique au type
    return defaultColors[index % defaultColors.length];        // Couleur cyclique par défaut
}

// ── Dessin de la roue sur le canvas ──────────────────────────────────────────
/**
 * Dessine la roue sur le canvas à partir d'un tableau d'options pondérées.
 * Chaque tranche est proportionnelle à son pourcentage (ou poids).
 * @param {Array}   options - Tableau d'objets { label, percentage } (ou { label, weight })
 * @param {boolean} isType  - Active les couleurs de type Pokémon si true
 */
function drawWheel(options, isType = false) {
    const totalWeight = options.reduce((sum, opt) => sum + (opt.percentage !== undefined ? opt.percentage : opt.weight), 0);
    const centerX = wheelCanvas.width / 2;
    const centerY = wheelCanvas.height / 2;
    const radius  = centerX; // Le rayon = moitié de la largeur → la roue remplit tout le canvas

    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height); // Efface le frame précédent

    let currentAngle = -Math.PI / 2; // On commence à 12h (haut = -90°) pour que le pointer
                                      // au centre pointe vers la première tranche

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        // Calcule l'angle de l'arc proportionnel au poids de la tranche
        const arc = ((option.percentage !== undefined ? option.percentage : option.weight) / totalWeight) * Math.PI * 2;

        // ── Dessin du secteur ──
        ctx.beginPath();
        ctx.fillStyle = getColor(option.label, isType, i);
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + arc, false);
        ctx.lineTo(centerX, centerY);
        ctx.fill();

        ctx.save(); // Sauvegarde l'état du contexte avant transformation (translation + rotation)

        // ── Couleur du texte ──
        // Electrique et Normal sont clairs → texte foncé pour la lisibilité ; reste = blanc
        ctx.fillStyle = isType && (option.label === 'Electrique' || option.label === 'Normal') ? '#1e293b' : 'white';
        if (!isType) ctx.fillStyle = 'white';
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 5;

        // Positionne le texte au milieu de l'arc, à 65% du rayon (pas trop près du centre ni du bord)
        const midAngle = currentAngle + arc / 2;
        ctx.translate(
            centerX + Math.cos(midAngle) * radius * 0.65,
            centerY + Math.sin(midAngle) * radius * 0.65
        );
        ctx.rotate(midAngle); // Oriente le texte dans le sens de la tranche
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";

        // N'affiche le texte que si la tranche représente >4% du total
        // (évite le chevauchement sur les très petites tranches)
        const weightRatio = (option.percentage !== undefined ? option.percentage : option.weight) / totalWeight;
        if (weightRatio > 0.04) {
            let fontSize = weightRatio < 0.1 ? 34 : 48; // Police plus petite pour les petites tranches
            ctx.font = `bold ${fontSize}px Poppins`;
            ctx.fillText(option.label, 0, 0);
        }

        ctx.restore(); // Restaure l'état avant transformation pour la prochaine tranche
        currentAngle += arc; // Avance l'angle de départ pour la tranche suivante
    }
}

// ── Animation de spin ─────────────────────────────────────────────────────────
/**
 * Lance l'animation de spin et retourne une Promise qui se résout avec le gagnant.
 * En mode 'rapide', l'animation est sautée et le gagnant est tiré immédiatement.
 *
 * @param {string}  title        - Titre à afficher pendant le spin (ex : "1. Rareté")
 * @param {Array}   optionsArray - Options pondérées pour cette roue
 * @param {boolean} isType       - Active les couleurs de type pour le dessin
 * @returns {Promise<Object>}    - Résout avec l'objet option gagnant
 */
function spinWheel(title, optionsArray, isType = false) {
    // ── Mode rapide : pas d'animation, résolution instantanée ──
    if (currentMode === 'rapide') {
        return new Promise((resolve) => {
            const winner = getRandomWeighted(optionsArray);
            resolve(winner);
        });
    }

    // ── Mode normal / manuel : animation CSS + résolution après SPIN_DURATION ──
    return new Promise((resolve) => {
        isAnimating = true;
        titleElem.textContent = title;
        winnerDisplay.textContent = "..."; // Placeholder pendant la rotation
        winnerDisplay.style.color = "white";

        drawWheel(optionsArray, isType); // Dessine la roue AVANT de la faire tourner

        // Remet la rotation CSS à sa valeur actuelle sans transition pour éviter un saut visuel
        wheelCanvas.style.transition = 'none';
        currentRotation = currentRotation % 360; // Normalise pour éviter des valeurs trop grandes
        wheelCanvas.style.transform = `rotate(${currentRotation}deg)`;
        void wheelCanvas.offsetHeight; // Force le reflow — sans ça, le navigateur ignorerait le changement de style

        // ── Tirage du gagnant et calcul de l'angle cible ──
        const winner   = getRandomWeighted(optionsArray);
        const winIndex = optionsArray.indexOf(winner);

        // Calcule les coordonnées angulaires (début/fin en degrés) de chaque tranche
        const totalWeight = optionsArray.reduce((sum, opt) => sum + (opt.percentage !== undefined ? opt.percentage : opt.weight), 0);
        let accumulatedDegrees = 0;
        let segmentsCoords = [];
        for (let i = 0; i < optionsArray.length; i++) {
            let arcDeg = ((optionsArray[i].percentage !== undefined ? optionsArray[i].percentage : optionsArray[i].weight) / totalWeight) * 360;
            segmentsCoords.push({ start: accumulatedDegrees, end: accumulatedDegrees + arcDeg, index: i });
            accumulatedDegrees += arcDeg;
        }

        // Choisit un point aléatoire DANS la tranche gagnante (avec marge pour ne pas tomber sur le bord)
        let winSegment    = segmentsCoords[winIndex];
        let margin        = winSegment.end - winSegment.start > 2 ? 1 : 0;
        let randomOffset  = margin + Math.random() * ((winSegment.end - winSegment.start) - margin * 2);
        const pointToHit  = winSegment.start + randomOffset;
        const targetOffset = -pointToHit; // Négatif car on fait tourner la roue dans le sens positif

        // Ajoute un minimum de 8 tours complets pour que l'animation soit spectaculaire
        const minSpins = 360 * 8;
        let delta = targetOffset - (currentRotation % 360);
        while (delta <= 0) delta += 360; // S'assure qu'on avance toujours (jamais en arrière)

        const targetRotation = currentRotation + minSpins + delta;

        // Lance la transition CSS avec une courbe d'ease-out pour un effet naturel de décélération
        wheelCanvas.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.9, 0.25, 1)`;
        wheelCanvas.style.transform  = `rotate(${targetRotation}deg)`;

        // ── Retour haptique pendant la rotation ──
        let lastSegment = -1;
        let startTime   = performance.now();

        function tickHaptics(time) {
            const computedStyle = window.getComputedStyle(wheelCanvas);
            const matrix = new (window.WebKitCSSMatrix || window.DOMMatrix)(computedStyle.transform);
            let rot = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);

            let pointerAngle = (360 - rot) % 360;
            if (pointerAngle < 0) pointerAngle += 360;

            let currentSegment = -1;
            for (let seg of segmentsCoords) {
                if (pointerAngle >= seg.start && pointerAngle < seg.end) {
                    currentSegment = seg.index;
                    break;
                }
            }
            if (currentSegment === -1) currentSegment = 0;

            if (currentSegment !== lastSegment && lastSegment !== -1) {
                vibrate(10);
            }
            lastSegment = currentSegment;

            if (time - startTime < SPIN_DURATION) {
                requestAnimationFrame(tickHaptics);
            }
        }
        requestAnimationFrame(tickHaptics);

        // ── Fin de l'animation ──
        setTimeout(() => {
            vibrate([40, 30, 80]);
            currentRotation = targetRotation; // Mémorise la rotation finale pour le prochain spin
            isAnimating = false;

            // Affiche le résultat gagnant au-dessus de la roue
            winnerDisplay.innerHTML = winner.label;
            if (isType && typeColors[winner.label]) {
                winnerDisplay.style.color = typeColors[winner.label]; // Couleur du type
            } else if (winner.label === '✨ OUI ✨' || winner.label === 'Oui') {
                winnerDisplay.style.color = '#FCD34D'; // Doré pour les résultats "rares/positifs"
            }

            resolve(winner); // Résout la Promise → le flux async dans lanceDestinee() continue
        }, SPIN_DURATION + 100); // +100ms de marge pour que la transition CSS soit vraiment terminée
    });
}

// ── Récapitulatif ─────────────────────────────────────────────────────────────
/**
 * Ajoute une ligne au récapitulatif affiché sous la roue.
 * @param {string}  label  - Nom de la caractéristique (ex : "Rareté", "Type 1")
 * @param {string}  value  - Valeur affichée (peut contenir du HTML pour coloriser)
 * @param {boolean} isMega - Si true, la valeur est affichée en doré (pour les boosts Méga)
 */
function addToSummary(label, value, isMega = false) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="font-bold border-b border-slate-700 pb-0.5 inline-block min-w-[80px]">${label}</span> : <span class="${isMega ? 'text-yellow-400 font-bold' : 'text-slate-100'}">${value}</span>`;
    summaryList.appendChild(li);
    // Auto-scroll vers le bas au fur et à mesure que des entrées s'ajoutent
    resultsDisplay.scrollTop = resultsDisplay.scrollHeight;
}

// Utilitaire : pause asynchrone (attend `ms` millisecondes)
const pause = (ms) => new Promise(r => setTimeout(r, ms));

// ── Flux principal du tirage ──────────────────────────────────────────────────
/**
 * Orchestre la séquence complète de tirages dans l'ordre :
 * Rareté → Double Type ? → Type(s) → Stats (×6) → Méga ? → [Boosts Méga si Oui] → Shiny ?
 *
 * Le flux est entièrement async/await : chaque étape attend la fin du spin (et du clic
 * en mode manuel) avant de passer à la suivante.
 *
 * @param {string} mode - 'auto' | 'rapide' | 'manuel'
 */
async function lanceDestinee(mode = 'auto') {
    currentMode = mode;
    if (isAnimating) return; // Sécurité anti-double-clic

    // ── Préparation de l'UI ──
    btnGenerer.disabled = true;
    btnGenerer.classList.add('opacity-50', 'cursor-not-allowed');
    summaryList.innerHTML = ''; // Réinitialise le récapitulatif
    resultsDisplay.classList.remove('hidden');
    outputSection.classList.add('hidden'); // Cache les outputs de la session précédente
    progression.classList.remove('hidden');

    const finalData = {}; // Accumulera tous les résultats pour la génération finale
    let stepCount = 1;

    // Met à jour l'indicateur de progression ("Étape X sur ~Y")
    function updateProgress(total) {
        progression.textContent = `Étape ${stepCount} sur ~${total}`;
        stepCount++;
    }

    try {
        // ── Étape 1 : Rareté ──
        await waitManualClick(); // En mode manuel, attend le clic avant de lancer
        updateProgress(13);
        const rarete = await spinWheel("1. Rareté", data.rarete);
        finalData.rarete = rarete.label;
        addToSummary("Rareté", finalData.rarete);
        if (currentMode === 'auto') await pause(PAUSE_DURATION);

        // ── Étape 2 : Double Type ? ──
        updateProgress(13);
        await waitManualClick();
        const isDoubleType = await spinWheel("2. Double Type ?", data.doubleType);
        finalData.isDouble = isDoubleType.label === "Oui";
        if (currentMode === 'auto') await pause(PAUSE_DURATION);

        // ── Étape 3 : Type Principal ──
        updateProgress(13);
        await waitManualClick();
        const type1 = await spinWheel("3. Type Principal", data.types, true);
        finalData.type1 = type1.label;
        addToSummary("Type 1", `<span style="color:${typeColors[type1.label]}">${type1.label}</span>`);

        // ── Étape 3b (conditionnelle) : Type Secondaire ──
        if (finalData.isDouble) {
            if (currentMode === 'auto') await pause(PAUSE_DURATION);
            updateProgress(13);
            // Exclut le type 1 déjà tiré pour éviter un doublon
            let optionsType2 = data.types.filter(t => t.label !== finalData.type1);
            await waitManualClick();
            const type2 = await spinWheel("3b. Type Secondaire", optionsType2, true);
            finalData.type2 = type2.label;
            addToSummary("Type 2", `<span style="color:${typeColors[type2.label]}">${type2.label}</span>`);
        } else {
            finalData.type2 = "Aucun"; // Pas de second type
        }
        if (currentMode === 'auto') await pause(PAUSE_DURATION);

        // ── Étape 4 : Stats (une roue par stat, 6 au total) ──
        finalData.stats = {};
        for (const stat of data.statsNames) {
            updateProgress(13);
            await waitManualClick();
            const pulledStat = await spinWheel(`4. Stat : ${stat.label}`, data.statsValues);
            finalData.stats[stat.key] = pulledStat.value; // Stocke par clé (hp, atk, def, spa, spd, vit)
            addToSummary(stat.label, finalData.stats[stat.key]);
            if (currentMode === 'auto') await pause(1000); // Pause plus courte entre les stats
        }

        // ── Étape 5 : Méga-Évolution ──
        updateProgress(13);
        await waitManualClick();
        const mega = await spinWheel("5. Transformation ?", data.mega);
        finalData.isMega = mega.label === "Oui";
        addToSummary("Méga-Evo", finalData.isMega ? "Oui" : "Non");
        if (currentMode === 'auto') await pause(PAUSE_DURATION);

        // ── Étapes 5a/5b (conditionnelles) : Boosts Méga ──
        if (finalData.isMega) {
            finalData.megaBoosts = {};
        
            // ── Roue : quelle stat est boostée en premier ? ──
            updateProgress(14);
            await waitManualClick();
            const boost1 = await spinWheel("Méga : Stat boostée 1", data.statsNames);
            addToSummary("Stat Méga 1", boost1.label, true);
            if (currentMode === 'auto') await pause(PAUSE_DURATION);
        
            // ── Roue : valeur du boost 1 ──
            updateProgress(15);
            await waitManualClick();
            const boostVal1 = await spinWheel(`Boost (${boost1.label})`, data.statsValues);
            finalData.stats[boost1.key] += boostVal1.value;
            addToSummary(`Boost Méga ${boost1.label}`, `+${boostVal1.value} (Total: ${finalData.stats[boost1.key]})`, true);
            if (currentMode === 'auto') await pause(PAUSE_DURATION);
        
            // ── Roue : quelle stat est boostée en second ? (exclut la première) ──
            const statsNamesPool2 = data.statsNames.filter(s => s.key !== boost1.key);
            updateProgress(16);
            await waitManualClick();
            const boost2 = await spinWheel("Méga : Stat boostée 2", statsNamesPool2);
            addToSummary("Stat Méga 2", boost2.label, true);
            if (currentMode === 'auto') await pause(PAUSE_DURATION);
        
            // ── Roue : valeur du boost 2 ──
            updateProgress(17);
            await waitManualClick();
            const boostVal2 = await spinWheel(`Boost (${boost2.label})`, data.statsValues);
            finalData.stats[boost2.key] += boostVal2.value;
            addToSummary(`Boost Méga ${boost2.label}`, `+${boostVal2.value} (Total: ${finalData.stats[boost2.key]})`, true);
            if (currentMode === 'auto') await pause(PAUSE_DURATION);
        }

        // ── Étape 6 : Shiny ──
        updateProgress(13);
        await waitManualClick();
        const shiny = await spinWheel("6. Shiny ?", data.shiny);
        finalData.isShiny = shiny.label === "Oui";
        if (finalData.isShiny) {
            addToSummary("Shiny", "✨ OUI ✨", true);
        } else {
            addToSummary("Shiny", "Non");
        }
        if (currentMode === 'auto') await pause(PAUSE_DURATION);

        // ── Fin du tirage ──
        titleElem.textContent = "Destinée Générée !";
        generateOutputs(finalData); // Construit et affiche le prompt + le CSV

    } catch (e) {
        console.error(e);
        titleElem.textContent = "Erreur de tirage";
    } finally {
        // Toujours réactiver le bouton, même en cas d'erreur
        btnGenerer.disabled = false;
        btnGenerer.classList.remove('opacity-50', 'cursor-not-allowed');
        progression.classList.add('hidden');
    }
}

// ── Génération des outputs finaux ─────────────────────────────────────────────
/**
 * À partir des résultats accumulés dans `d`, génère :
 * 1. Une ligne CSV prête à coller dans un tableur
 * 2. Un prompt en français pour demander à ChatGPT de créer le Fakemon
 *
 * @param {Object} d - L'objet finalData rempli par lanceDestinee()
 */
function generateOutputs(d) {
    // Calcul du total des stats de base (BST)
    const totalStats = d.stats.hp + d.stats.atk + d.stats.def + d.stats.spa + d.stats.spd + d.stats.vit;
    const typeString = d.isDouble ? `${d.type1} et ${d.type2}` : d.type1;

    // ── CSV ──
    const csvHeader = "Rareté,Type 1,Type 2,PV,ATT,DEF,ATT.Spe,DEF.Spe,VIT,Total,Méga-Evo,Shiny";
    const csvRow    = `${d.rarete},${d.type1},${d.type2},${d.stats.hp},${d.stats.atk},${d.stats.def},${d.stats.spa},${d.stats.spd},${d.stats.vit},${totalStats},${d.isMega ? 'Oui' : 'Non'},${d.isShiny ? 'Oui' : 'Non'}`;
    csvOutput.value = `${csvHeader}\n${csvRow}`;

    // ── Prompt ChatGPT ──
    let prompt = `Génère moi un pokémon avec ses stats là :
- Rareté / Lignée : ${d.rarete}
- Type(s) : ${typeString}
- Base Stats Total : ${totalStats} (Profil : PV ${d.stats.hp}, ATK ${d.stats.atk}, DEF ${d.stats.def}, ATK SPE ${d.stats.spa}, DEF SPE ${d.stats.spd}, VIT ${d.stats.vit})`;

    // Ajoute des lignes optionnelles selon les résultats
    if (d.isMega) prompt  += `\n- Méga-Évolution (PS : Les stats de base sont déjà boostées.)`;
    if (d.isShiny) prompt += `\n- Shiny`;

    promptOutput.value = prompt;
    outputSection.classList.remove('hidden'); // Révèle la section outputs

    vibrate([100, 50, 100, 50, 400]);
}

// ── Binding des boutons ───────────────────────────────────────────────────────
btnGenerer.addEventListener('click', () => lanceDestinee('auto'));

const btnRapide = document.getElementById('btn-rapide');
if (btnRapide) btnRapide.addEventListener('click', () => lanceDestinee('rapide'));

const btnManuel = document.getElementById('btn-manuel');
if (btnManuel) btnManuel.addEventListener('click', () => lanceDestinee('manuel'));

// ── Initialisation ────────────────────────────────────────────────────────────
// Dessine la roue de Rareté au chargement de la page (état "Prêt à jouer")
drawWheel(data.rarete);
