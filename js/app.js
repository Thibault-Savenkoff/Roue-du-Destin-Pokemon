// =============================================================================
// app.js — Logique principale de la Roue du Destin
// Gère le rendu canvas de la roue, les animations de spin, les 3 modes de jeu
// (auto, rapide, manuel), et la génération des outputs finaux (prompt + CSV).
// Dépend de data.js pour les tableaux de probabilités.
// =============================================================================


// ── Références aux éléments du DOM ──────────────────────────────────────────
const btnGenerer      = document.getElementById('btn-generer');
const titleElem       = document.getElementById('roue-title');
const progression     = document.getElementById('progression');
const progressionText = document.getElementById('progression-text');
const progressionBar  = document.getElementById('progression-bar');
const resultsDisplay  = document.getElementById('results-display');
const summaryList     = document.getElementById('summary-list');
const outputSection   = document.getElementById('output-section');
const promptOutput    = document.getElementById('prompt-output');
const csvOutput       = document.getElementById('csv-output');
const winnerDisplay   = document.getElementById('winner-display');
const btnRejouer      = document.getElementById('btn-rejouer');

if (btnGenerer) {
    btnGenerer.type = 'button';
    btnGenerer.removeAttribute('disabled');
    btnGenerer.style.pointerEvents = 'auto';
    btnGenerer.classList.remove('opacity-50', 'cursor-not-allowed');
}

// ── Config Canvas ────────────────────────────────────────────────────────────
const wheelCanvas = document.getElementById('wheel-canvas'); // L'élément <canvas> de la roue
const ctx = wheelCanvas.getContext('2d'); // Contexte 2D pour dessiner dessus

let currentRotation = 0;    // Angle de rotation cumulé (en degrés) — ne se reset jamais pour
                              // que la roue reparte de sa position actuelle à chaque spin
let isAnimating = false;     // Verrou : empêche de relancer un spin pendant qu'un est en cours
let currentMode = 'auto';    // Mode actif : 'auto' | 'rapide' | 'manuel'
let manualResolve = null;    // Stocke la fonction resolve() d'une Promise en attente d'un clic
let manualSessionId = 0;       // Identifie la session manuelle active
                              // (utilisé uniquement en mode manuel pour "débloquer" l'étape suivante)

/**
 * Vibration helper using la Web Vibration API native du navigateur.
 * Ne fait rien si l'API n'est pas supportée.
 * @param {number|Array<number>} pattern
 */
function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

// ── Indicateur de mode actif ─────────────────────────────────────────────────
function updateModeButtons(activeMode) {
    const map = {
        auto:   btnGenerer,
        rapide: document.getElementById('btn-rapide'),
        manuel: document.getElementById('btn-manuel'),
    };
    const rings = {
        auto:   ['ring-2', 'ring-blue-300',   'ring-offset-2', 'ring-offset-slate-900'],
        rapide: ['ring-2', 'ring-yellow-300', 'ring-offset-2', 'ring-offset-slate-900'],
        manuel: ['ring-2', 'ring-green-300',  'ring-offset-2', 'ring-offset-slate-900'],
    };
    const allRing = ['ring-2', 'ring-blue-300', 'ring-yellow-300', 'ring-green-300', 'ring-offset-2', 'ring-offset-slate-900'];
    for (const [mode, btn] of Object.entries(map)) {
        if (!btn) continue;
        btn.classList.remove(...allRing);
        if (mode === activeMode) btn.classList.add(...rings[mode]);
    }
}

let confettiContainer = null;
let confettiPieces = [];
let confettiAnimationId = null;
const confettiColors = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#FCD34D', '#FFFFFF'];

function ensureConfettiLayer() {
    if (confettiContainer) return;
    const stage = document.body;

    confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100vw';
    confettiContainer.style.height = '100vh';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.overflow = 'visible';
    confettiContainer.style.zIndex = '9998';
    stage.appendChild(confettiContainer);

    const style = document.createElement('style');
    style.textContent = `
        .confetti-piece {
            position: absolute;
            pointer-events: none;
            border-radius: 2px;
            will-change: transform, opacity;
            transform-origin: center;
        }
    `;
    document.head.appendChild(style);
}

function createConfettiPiece(width, height) {
    const el = document.createElement('div');
    const pieceWidth = Math.random() * 8 + 6;
    const pieceHeight = Math.max(3, pieceWidth * (Math.random() * 0.7 + 0.25));
    const startX = Math.random() * width;
    const startY = Math.random() * -80 - pieceHeight;
    const velocityX = (Math.random() - 0.5) * 12;
    const velocityY = Math.random() * 1.6 + 2.6;
    const rotation = Math.random() * 360;
    const rotationSpeed = (Math.random() - 0.5) * 24;
    const colorIndex = Math.floor(Math.random() * confettiColors.length);

    el.className = 'confetti-piece';
    el.style.width = `${pieceWidth}px`;
    el.style.height = `${pieceHeight}px`;
    el.style.backgroundColor = confettiColors[colorIndex];
    el.style.borderRadius = Math.random() < 0.25 ? '50%' : `${Math.random() * 3 + 2}px`;
    el.style.transform = `translate3d(${startX}px, ${startY}px, 0) rotate(${rotation}deg)`;
    el.style.opacity = '0.98';

    confettiContainer.appendChild(el);

    return {
        el,
        x: startX,
        y: startY,
        vx: velocityX,
        vy: velocityY,
        rotation,
        rotationSpeed,
        alpha: 0.98,
        drift: (Math.random() - 0.5) * 0.22,
        wobble: Math.random() * 0.08 + 0.02
    };
}

function updateConfetti() {
    if (!confettiContainer || confettiPieces.length === 0) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    for (let i = confettiPieces.length - 1; i >= 0; i--) {
        const piece = confettiPieces[i];
        
        piece.vy += 0.14;
        piece.x += piece.vx + Math.sin(piece.y * 0.03) * piece.wobble * 5;
        piece.y += piece.vy;
        piece.rotation += piece.rotationSpeed;
        piece.vx += piece.drift * 0.08;
        piece.alpha -= 0.0055;

        piece.el.style.opacity = Math.max(0, piece.alpha);
        piece.el.style.transform = `translate3d(${piece.x}px, ${piece.y}px, 0) rotate(${piece.rotation}deg)`;

        if (piece.y > height + 50 || piece.alpha <= 0) {
            piece.el.remove();
            confettiPieces.splice(i, 1);
        }
    }

    if (confettiPieces.length > 0) {
        confettiAnimationId = requestAnimationFrame(updateConfetti);
    } else {
        confettiAnimationId = null;
    }
}

function launchConfetti(count = 35) {
    // Router: decide between canvas renderer and DOM renderer
    const storedMode = localStorage.getItem('confetti.mode') || 'auto';
    const storedIntensity = parseInt(localStorage.getItem('confetti.intensity') || '100', 10);
    const intensity = Number.isFinite(storedIntensity) ? Math.max(0, Math.min(100, storedIntensity)) : 100;

    const isLowEndDevice = (() => {
        try {
            return (navigator.deviceMemory && navigator.deviceMemory < 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
        } catch (e) {
            return false;
        }
    })();

    const mode = storedMode === 'dom' ? 'dom' : 'canvas';
    const safeIntensity = storedMode === 'auto' && isLowEndDevice ? Math.min(intensity, 60) : intensity;

    if (mode === 'canvas') {
        launchConfettiCanvas(count, safeIntensity);
        return;
    }

    // Fallback to existing DOM implementation
    const spawnCount = Math.min(Math.max(Math.round(count * safeIntensity / 140), 6), 30);
    ensureConfettiLayer();
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = 0; i < spawnCount; i++) {
        confettiPieces.push(createConfettiPiece(width, height));
    }

    if (!confettiAnimationId) {
        confettiAnimationId = requestAnimationFrame(updateConfetti);
    }
}

// ── Canvas-based confetti implementation (performant) ───────────────────────
let confettiCanvas = null;
let confettiCanvasCtx = null;
let confettiCanvasParticles = [];
let confettiCanvasAnimId = null;

function ensureConfettiCanvas() {
    if (confettiCanvas) return;
    const stage = document.body;

    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confetti-canvas';
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.width = '100vw';
    confettiCanvas.style.height = '100vh';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '9999';
    stage.appendChild(confettiCanvas);

    function resizeCanvas() {
        confettiCanvas.width = Math.max(1, Math.floor(window.innerWidth));
        confettiCanvas.height = Math.max(1, Math.floor(window.innerHeight));
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    confettiCanvasCtx = confettiCanvas.getContext('2d');
}

function launchConfettiCanvas(count = 35, intensity = 100) {
    ensureConfettiCanvas();
    const wrapper = wheelCanvas.parentElement;
    const width = confettiCanvas.width || wrapper.clientWidth;
    const height = confettiCanvas.height || wrapper.clientHeight;

    const spawnCount = Math.min(Math.max(Math.round(count * intensity / 140), 6), 30);

    for (let i = 0; i < spawnCount; i++) {
        const pieceWidth = Math.random() * 8 + 5;
        const pieceHeight = Math.max(3, pieceWidth * (Math.random() * 0.8 + 0.4));
        const x = Math.random() * width;
        const y = Math.random() * -80 - pieceHeight;
        const vx = (Math.random() - 0.5) * 10;
        const vy = Math.random() * 2 + 2.5;
        const rotation = Math.random() * Math.PI * 2;
        const rotationSpeed = (Math.random() - 0.5) * 0.45;
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        const alpha = 0.98;
        const drift = (Math.random() - 0.5) * 0.25;
        const wobble = Math.random() * 0.08 + 0.02;
        const rounded = Math.random() < 0.28;
        const phase = Math.random() * Math.PI * 2;

        confettiCanvasParticles.push({ x, y, vx, vy, w: pieceWidth, h: pieceHeight, rotation, rotationSpeed, color, alpha, drift, wobble, rounded, phase });
    }

    if (!confettiCanvasAnimId) {
        confettiCanvasAnimId = requestAnimationFrame(updateConfettiCanvas);
    }
}

function updateConfettiCanvas() {
    if (!confettiCanvasCtx || confettiCanvasParticles.length === 0) {
        confettiCanvasAnimId = null;
        if (confettiCanvasCtx) confettiCanvasCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        return;
    }

    const ctx2 = confettiCanvasCtx;
    const width = confettiCanvas.width;
    const height = confettiCanvas.height;

    ctx2.clearRect(0, 0, width, height);

    for (let i = confettiCanvasParticles.length - 1; i >= 0; i--) {
        const p = confettiCanvasParticles[i];

        p.vy += 0.13;
        p.x += p.vx + Math.sin(p.y * 0.04 + p.phase) * p.wobble * 10;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vx += p.drift * 0.08;
        p.alpha -= 0.0065;

        ctx2.save();
        ctx2.globalAlpha = Math.max(0, p.alpha);
        ctx2.translate(p.x, p.y);
        ctx2.rotate(p.rotation);
        ctx2.fillStyle = p.color;

        if (p.rounded) {
            // draw rounded rectangle / pill shape
            const r = Math.min(p.h, p.w) / 2;
            ctx2.beginPath();
            ctx2.moveTo(-p.w/2 + r, -p.h/2);
            ctx2.arcTo(p.w/2, -p.h/2, p.w/2, p.h/2, r);
            ctx2.arcTo(p.w/2, p.h/2, -p.w/2, p.h/2, r);
            ctx2.arcTo(-p.w/2, p.h/2, -p.w/2, -p.h/2, r);
            ctx2.arcTo(-p.w/2, -p.h/2, p.w/2, -p.h/2, r);
            ctx2.closePath();
            ctx2.fill();
        } else if (p.w > p.h * 1.6) {
            ctx2.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        } else {
            ctx2.beginPath();
            ctx2.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
            ctx2.fill();
        }

        ctx2.restore();

        if (p.y > height + 50 || p.alpha <= 0) {
            confettiCanvasParticles.splice(i, 1);
        }
    }

    if (confettiCanvasParticles.length > 0) {
        confettiCanvasAnimId = requestAnimationFrame(updateConfettiCanvas);
    } else {
        confettiCanvasAnimId = null;
    }
}

// Expose setters (persist to localStorage)
function setConfettiMode(mode) {
    if (!['auto','canvas','dom'].includes(mode)) mode = 'auto';
    localStorage.setItem('confetti.mode', mode);
}

function setConfettiIntensity(n) {
    const v = Math.max(0, Math.min(100, Number(n) || 100));
    localStorage.setItem('confetti.intensity', String(v));
}

// Make simple globals accessible for debugging in console
window.setConfettiMode = setConfettiMode;
window.setConfettiIntensity = setConfettiIntensity;

// ── Gestion du clic sur le canvas (mode manuel) ──────────────────────────────
// En mode manuel, l'utilisateur doit cliquer sur la roue pour déclencher chaque spin.
wheelCanvas.addEventListener('click', () => {
    // Cas 1 : on n'est pas en mode manuel → on lance tout le processus en mode manuel
    if (currentMode !== 'manuel' && !isAnimating) {
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

    manualSessionId += 1;
    const sessionId = manualSessionId;

    return new Promise(resolve => {
        manualResolve = () => {
            if (sessionId !== manualSessionId) return;
            manualResolve = null;
            resolve();
        };

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

const MIN_DISPLAY_WHEEL_RATIO = 0.04; // Pourcentage minimum affiché sur la roue de visualisation

function getNumericWeight(option) {
    return option.percentage !== undefined ? option.percentage : option.weight;
}

function getDisplayOptions(options) {
    const totalWeight = options.reduce((sum, opt) => sum + getNumericWeight(opt), 0);
    const minDisplayWeight = totalWeight * MIN_DISPLAY_WHEEL_RATIO;

    return options.map(opt => ({
        ...opt,
        percentage: Math.max(getNumericWeight(opt), minDisplayWeight)
    }));
}

function computeSegmentCoords(options) {
    const totalWeight = options.reduce((sum, opt) => sum + getNumericWeight(opt), 0);
    let accumulatedDegrees = 0;
    return options.map((opt, index) => {
        const arcDeg = (getNumericWeight(opt) / totalWeight) * 360;
        const segment = { start: accumulatedDegrees, end: accumulatedDegrees + arcDeg, index };
        accumulatedDegrees += arcDeg;
        return segment;
    });
}

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
        const markerAngle = currentAngle + arc / 2;
        ctx.beginPath();
        ctx.fillStyle = getColor(option.label, isType, i);
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + arc, false);
        ctx.lineTo(centerX, centerY);
        ctx.fill();

        // Si la tranche est très fine, ajoute un marqueur visuel extérieur
        const isTinySlice = arc < 0.04; // ≈ 2.3°
        if (isTinySlice) {
            const edgeX = centerX + Math.cos(markerAngle) * radius;
            const edgeY = centerY + Math.sin(markerAngle) * radius;
            const markerX = centerX + Math.cos(markerAngle) * (radius * 0.9);
            const markerY = centerY + Math.sin(markerAngle) * (radius * 0.9);

            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(edgeX, edgeY);
            ctx.lineTo(markerX, markerY);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(edgeX, edgeY, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }

        ctx.save(); // Sauvegarde l'état du contexte avant transformation (translation + rotation)

        // ── Couleur du texte ──
        // Electrique et Normal sont clairs → texte foncé pour la lisibilité ; reste = blanc
        ctx.fillStyle = isType && (option.label === 'Electrique' || option.label === 'Normal') ? '#1e293b' : 'white';
        if (!isType) ctx.fillStyle = 'white';
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 5;

        const midAngle = currentAngle + arc / 2;
        const weightRatio = (option.percentage !== undefined ? option.percentage : option.weight) / totalWeight;
        let fontSize;
        let labelRadius;
        let labelOutside = false;

        if (weightRatio > 0.1) {
            fontSize = 64;
            labelRadius = radius * 0.65;
        } else if (weightRatio > 0.04) {
            fontSize = 52;
            labelRadius = radius * 0.65;
        } else if (weightRatio > 0.02) {
            fontSize = 42;
            labelRadius = radius * 0.75;
        } else {
            fontSize = 36;
            labelRadius = radius * 0.92;
            labelOutside = true;
        }

        // Positionne le texte au bon rayon selon la taille de la tranche.
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;
        ctx.translate(labelX, labelY);

        if (!labelOutside) {
            ctx.rotate(midAngle); // Oriente le texte dans le sens de la tranche
            if (Math.cos(midAngle) < 0) ctx.rotate(Math.PI); // Garde le texte lisible sur la gauche
        }
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";

        ctx.font = `bold ${fontSize}px Poppins`;
        ctx.fillText(option.label, 0, 0);

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

    const displayOptions = getDisplayOptions(optionsArray);
    const displaySegments = computeSegmentCoords(displayOptions);

    // ── Mode normal / manuel : animation CSS + résolution après SPIN_DURATION ──
    return new Promise((resolve) => {
        isAnimating = true;
        titleElem.textContent = title;
        winnerDisplay.textContent = "..."; // Placeholder pendant la rotation
        winnerDisplay.style.color = "white";

        drawWheel(displayOptions, isType); // Dessine la roue de visualisation

        // Remet la rotation CSS à sa valeur actuelle sans transition pour éviter un saut visuel
        wheelCanvas.style.transition = 'none';
        currentRotation = currentRotation % 360; // Normalise pour éviter des valeurs trop grandes
        wheelCanvas.style.transform = `rotate(${currentRotation}deg)`;
        void wheelCanvas.offsetHeight; // Force le reflow — sans ça, le navigateur ignorerait le changement de style

        // ── Tirage du gagnant et calcul de l'angle cible ──
        const winner   = getRandomWeighted(optionsArray);
        const winIndex = optionsArray.indexOf(winner);
        let segmentsCoords = displaySegments;

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
                playTick();
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

            winnerDisplay.style.transform = 'scale(1.2)';
            winnerDisplay.style.transition = 'transform 200ms ease-out';
            requestAnimationFrame(() => {
                winnerDisplay.style.transform = 'scale(1)';
            });

            playReveal();
            launchConfetti(90);
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
    // Cancel any previous manual waiting session when switching away from manual
    if (mode !== 'manuel' && manualResolve) {
        manualSessionId += 1;
        manualResolve = null;
    }

    currentMode = mode;
    if (isAnimating) return; // Sécurité anti-double-clic

    // ── Préparation de l'UI ──
    updateModeButtons(mode);
    btnGenerer.classList.remove('opacity-50', 'cursor-not-allowed');
    summaryList.innerHTML = '';
    resultsDisplay.classList.add('hidden');    // Masque les résultats du tirage précédent
    outputSection.classList.add('hidden');     // Masque les outputs du tirage précédent
    if (btnRejouer) { btnRejouer.classList.add('hidden'); btnRejouer.classList.remove('flex'); }
    progression.classList.remove('hidden');
    if (progressionBar) progressionBar.style.width = '0%';

    const finalData = {}; // Accumulera tous les résultats pour la génération finale
    let stepCount = 1;

    function updateProgress(total) {
        if (progressionText) progressionText.textContent = `Étape ${stepCount} sur ~${total}`;
        if (progressionBar)  progressionBar.style.width  = `${Math.min(100, Math.round((stepCount / total) * 100))}%`;
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
        const mega = await spinWheel("5. Méga-Evolution ?", data.mega);
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
            playShiny();
        } else {
            addToSummary("Shiny", "Non");
        }
        if (currentMode === 'auto') await pause(PAUSE_DURATION);

        // ── Fin du tirage ──
        titleElem.textContent = "Destinée Générée !";
        playFanfare();
        generateOutputs(finalData); // Construit et affiche le prompt + le CSV

    } catch (e) {
        console.error(e);
        titleElem.textContent = "Erreur de tirage";
    } finally {
        btnGenerer.classList.remove('opacity-50', 'cursor-not-allowed');
        progression.classList.add('hidden');
        updateModeButtons(null);
        if (btnRejouer) { btnRejouer.classList.remove('hidden'); btnRejouer.classList.add('flex'); }
        resultsDisplay.classList.remove('hidden');
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
if (btnGenerer) {
    btnGenerer.removeAttribute('disabled');
    btnGenerer.style.pointerEvents = 'auto';
    btnGenerer.classList.remove('opacity-50', 'cursor-not-allowed');

    const switchToAutoMode = () => {
        if (isAnimating) return;
        if (currentMode === 'manuel' && manualResolve) {
            // Mid-sequence: continue the current sequence in auto mode
            currentMode = 'auto';
            manualResolve();
            manualResolve = null;
            return;
        }
        lanceDestinee('auto');
    };

    btnGenerer.addEventListener('click', switchToAutoMode);
    btnGenerer.onclick = switchToAutoMode;
}

const btnRapide = document.getElementById('btn-rapide');
if (btnRapide) btnRapide.addEventListener('click', () => lanceDestinee('rapide'));

const btnManuel = document.getElementById('btn-manuel');
if (btnManuel) btnManuel.addEventListener('click', () => lanceDestinee('manuel'));

// Rejouer : relance le dernier mode utilisé
if (btnRejouer) btnRejouer.addEventListener('click', () => {
    if (!isAnimating) lanceDestinee(currentMode || 'auto');
});

// Mode TikTok : démarre automatiquement en AUTO dès l'activation
document.addEventListener('tiktok-start', () => {
    if (!isAnimating) lanceDestinee('auto');
});

// ── Initialisation ────────────────────────────────────────────────────────────
// Dessine la roue de Rareté au chargement de la page (état "Prêt à jouer").
// On attend que la police Poppins soit chargée pour que le texte du canvas
// s'affiche correctement dès le premier rendu.
function initWheel() {
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => drawWheel(data.rarete)).catch(() => drawWheel(data.rarete));
    } else {
        drawWheel(data.rarete);
    }
}

initWheel();

// Si on vient de la page settings (bouton Tester), permette un aperçu rapide
if (new URLSearchParams(location.search).get('previewConfetti') === '1') {
    // delay léger pour que le canvas et le wrapper aient eu le temps de se dimensionner
    setTimeout(() => launchConfetti(45), 250);
}
