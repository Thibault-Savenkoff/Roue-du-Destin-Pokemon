import { data, getRandomWeighted } from './data.js';

const btnGenerer = document.getElementById('btn-generer');
const titleElem = document.getElementById('roue-title');
const progression = document.getElementById('progression');
const resultsDisplay = document.getElementById('results-display');
const summaryList = document.getElementById('summary-list');
const outputSection = document.getElementById('output-section');
const promptOutput = document.getElementById('prompt-output');
const csvOutput = document.getElementById('csv-output');
const winnerDisplay = document.getElementById('winner-display');

// Config Canvas
const wheelCanvas = document.getElementById('wheel-canvas');
const ctx = wheelCanvas.getContext('2d');
let currentRotation = 0;
let isAnimating = false;
let currentMode = 'auto'; // 'auto', 'rapide', 'manuel'
let manualResolve = null;

// Gérer le clic sur la roue en mode manuel
wheelCanvas.addEventListener('click', () => {
    // Active directement le mode manuel si clique et qu'on n'y était pas
    if (currentMode !== 'manuel' && !isAnimating && !btnGenerer.disabled) {
        lanceDestinee('manuel');
    }
    else if (currentMode === 'manuel' && manualResolve && !isAnimating) {
        manualResolve();
        manualResolve = null;
        document.getElementById('center-circle').textContent = "Spin";
    }
});

function waitManualClick() {
    if (currentMode !== 'manuel') return Promise.resolve();
    return new Promise(resolve => {
        manualResolve = resolve;
        titleElem.textContent = "👆 Cliquez sur la roue pour lancer...";
        document.getElementById('center-circle').textContent = "Tap";
    });
}


let PAUSE_DURATION = 2500;
let SPIN_DURATION = 4000;

const defaultColors = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#FCD34D', '#9CA3AF'];
const typeColors = {
    'Feu': '#F08030', 'Eau': '#6890F0', 'Plante': '#78C850', 'Electrique': '#F8D030',
    'Glace': '#98D8D8', 'Combat': '#C03028', 'Poison': '#A040A0', 'Sol': '#E0C068',
    'Vol': '#A890F0', 'Psy': '#F85888', 'Insecte': '#A8B820', 'Roche': '#B8A038',
    'Spectre': '#705898', 'Dragon': '#7038F8', 'Ténèbres': '#705848', 'Acier': '#B8B8D0',
    'Fée': '#EE99AC', 'Normal': '#A8A878'
};

function getColor(label, isType, index) {
    if (isType && typeColors[label]) return typeColors[label];
    return defaultColors[index % defaultColors.length];
}

// Moteur de rendu pondéré (avec poids)
function drawWheel(options, isType = false) {
    const totalWeight = options.reduce((sum, opt) => sum + (opt.percentage !== undefined ? opt.percentage : opt.weight), 0);
    const centerX = wheelCanvas.width / 2;
    const centerY = wheelCanvas.height / 2;
    const radius = centerX; // Remplit le canvas

    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

    let currentAngle = -Math.PI / 2; // Départ en haut (270 degrés)

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const arc = ((option.percentage !== undefined ? option.percentage : option.weight) / totalWeight) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.fillStyle = getColor(option.label, isType, i);
        
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + arc, false);
        ctx.lineTo(centerX, centerY);
        ctx.fill();
        
        ctx.save();
        
        // Texte
        ctx.fillStyle = isType && (option.label === 'Electrique' || option.label === 'Normal') ? '#1e293b' : 'white';
        if(!isType) ctx.fillStyle = 'white';
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 5;
        
        const midAngle = currentAngle + arc / 2;
        ctx.translate(
            centerX + Math.cos(midAngle) * radius * 0.65,
            centerY + Math.sin(midAngle) * radius * 0.65
        );
        ctx.rotate(midAngle);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Cacher le texte si la tranche est ridiculement petite pour éviter le chevauchement
        const weightRatio = (option.percentage !== undefined ? option.percentage : option.weight) / totalWeight;
        if (weightRatio > 0.04) {
            // Tailles de texte considérablement augmentées
            let fontSize = weightRatio < 0.1 ? 34 : 48;
            ctx.font = `bold ${fontSize}px Poppins`;
            ctx.fillText(option.label, 0, 0);
        }
        
        ctx.restore();
        currentAngle += arc;
    }
}

function spinWheel(title, optionsArray, isType = false) {
    if (currentMode === 'rapide') {
        return new Promise((resolve) => {
            const winner = getRandomWeighted(optionsArray);
            resolve(winner);
        });
    }

    return new Promise((resolve) => {
        isAnimating = true;
        titleElem.textContent = title;
        winnerDisplay.textContent = "..."; // Indique que ça tourne
        winnerDisplay.style.color = "white"; // Reset de couleur

        drawWheel(optionsArray, isType);
        
        wheelCanvas.style.transition = 'none';
        currentRotation = currentRotation % 360;
        wheelCanvas.style.transform = `rotate(${currentRotation}deg)`;
        void wheelCanvas.offsetHeight; 
        
        const winner = getRandomWeighted(optionsArray);
        const winIndex = optionsArray.indexOf(winner);
        
        const totalWeight = optionsArray.reduce((sum, opt) => sum + (opt.percentage !== undefined ? opt.percentage : opt.weight), 0);
        let accumulatedDegrees = 0;
        let segmentsCoords = [];
        
        for(let i=0; i<optionsArray.length; i++) {
            let arcDeg = ((optionsArray[i].percentage !== undefined ? optionsArray[i].percentage : optionsArray[i].weight) / totalWeight) * 360;
            segmentsCoords.push({start: accumulatedDegrees, end: accumulatedDegrees + arcDeg, index: i});
            accumulatedDegrees += arcDeg;
        }
        
        let winSegment = segmentsCoords[winIndex];
        // Marge pour atterrir dans la tranche en toute sécurité
        let margin = winSegment.end - winSegment.start > 2 ? 1 : 0; 
        let randomOffset = margin + Math.random() * ((winSegment.end - winSegment.start) - margin*2);
        
        const pointToHit = winSegment.start + randomOffset;
        const targetOffset = -pointToHit;
        
        const minSpins = 360 * 8; 
        
        let delta = targetOffset - (currentRotation % 360);
        while (delta <= 0) delta += 360;
        
        const targetRotation = currentRotation + minSpins + delta;
        
        wheelCanvas.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.9, 0.25, 1)`;
        wheelCanvas.style.transform = `rotate(${targetRotation}deg)`;
        
        let lastSegment = -1;
        let startTime = performance.now();
        
        function tickHaptics(time) {
            const computedStyle = window.getComputedStyle(wheelCanvas);
            const matrix = new WebKitCSSMatrix(computedStyle.transform);
            let rot = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
            
            // Calculer l'angle du pointer virtuel
            let pointerAngle = (360 - rot) % 360;
            if (pointerAngle < 0) pointerAngle += 360;
            
            let currentSegment = -1;
            for(let seg of segmentsCoords) {
                if(pointerAngle >= seg.start && pointerAngle < seg.end) {
                    currentSegment = seg.index;
                    break;
                }
            }
            if(currentSegment === -1) currentSegment = 0;
            
            if (currentSegment !== lastSegment && lastSegment !== -1) {
                if (navigator.vibrate) navigator.vibrate(10);
            }
            lastSegment = currentSegment;
            
            if (time - startTime < SPIN_DURATION) {
                requestAnimationFrame(tickHaptics);
            }
        }
        requestAnimationFrame(tickHaptics);

        setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
            currentRotation = targetRotation;
            isAnimating = false;
            
            // Affichage du résultat au dessus de la roue !
            winnerDisplay.innerHTML = winner.label;
            if (isType && typeColors[winner.label]) {
                winnerDisplay.style.color = typeColors[winner.label];
            } else if (winner.label === '✨ OUI ✨' || winner.label === 'Oui') {
                winnerDisplay.style.color = '#FCD34D'; // Doré pour les succès rares
            }
            
            resolve(winner);
        }, SPIN_DURATION + 100);
    });
}

function addToSummary(label, value, isMega = false) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="font-bold border-b border-slate-700 pb-0.5 inline-block min-w-[80px]">${label}</span> : <span class="${isMega ? 'text-yellow-400 font-bold' : 'text-slate-100'}">${value}</span>`;
    summaryList.appendChild(li);
    resultsDisplay.scrollTop = resultsDisplay.scrollHeight;
}

const pause = (ms) => new Promise(r => setTimeout(r, ms));

async function lanceDestinee(mode = 'auto') {
    currentMode = mode;
    if (isAnimating) return;
    btnGenerer.disabled = true;
    btnGenerer.classList.add('opacity-50', 'cursor-not-allowed');
    summaryList.innerHTML = '';
    resultsDisplay.classList.remove('hidden');
    outputSection.classList.add('hidden');
    progression.classList.remove('hidden');
    
    const finalData = {};
    let stepCount = 1;
    function updateProgress(total) {
        progression.textContent = `Étape ${stepCount} sur ~${total}`;
        stepCount++;
    }

    try {
        await waitManualClick();
        updateProgress(13);
        const rarete = await spinWheel("1. Rareté", data.rarete);
        finalData.rarete = rarete.label;
        addToSummary("Rareté", finalData.rarete);
        if(currentMode !== 'rapide') await pause(PAUSE_DURATION); 

        updateProgress(13);
        await waitManualClick();
        const isDoubleType = await spinWheel("2. Double Type ?", data.doubleType);
        finalData.isDouble = isDoubleType.label === "Oui";
        if(currentMode !== 'rapide') await pause(PAUSE_DURATION);

        updateProgress(13);
        await waitManualClick();
        const type1 = await spinWheel("3. Type Principal", data.types, true);
        finalData.type1 = type1.label;
        addToSummary("Type 1", `<span style="color:${typeColors[type1.label]}">${type1.label}</span>`);
        
        if (finalData.isDouble) {
            if(currentMode !== 'rapide') await pause(PAUSE_DURATION);
            updateProgress(13);
            let optionsType2 = data.types.filter(t => t.label !== finalData.type1);
            await waitManualClick();
        const type2 = await spinWheel("3b. Type Secondaire", optionsType2, true);
            finalData.type2 = type2.label;
            addToSummary("Type 2", `<span style="color:${typeColors[type2.label]}">${type2.label}</span>`);
        } else {
            finalData.type2 = "Aucun";
        }
        if(currentMode !== 'rapide') await pause(PAUSE_DURATION);

        finalData.stats = {};
        for (const stat of data.statsNames) {
            updateProgress(13);
            await waitManualClick();
            const pulledStat = await spinWheel(`4. Stat : ${stat.label}`, data.statsValues);
            finalData.stats[stat.key] = pulledStat.value;
            addToSummary(stat.label, finalData.stats[stat.key]);
            if(currentMode !== 'rapide') await pause(1000); 
        }

        updateProgress(13);
        await waitManualClick();
        const mega = await spinWheel("5. Transformation ?", data.mega);
        finalData.isMega = mega.label === "Oui";
        addToSummary("Méga-Evo", finalData.isMega ? "Oui" : "Non");
        if(currentMode !== 'rapide') await pause(PAUSE_DURATION);

        if (finalData.isMega) {
            finalData.megaBoosts = {};
            let statNamesPool = [...data.statsNames];
            statNamesPool.sort(() => 0.5 - Math.random());
            const boost1 = statNamesPool[0];
            const boost2 = statNamesPool[1];

            updateProgress(14);
            await waitManualClick();
            const boostVal1 = await spinWheel(`Boost (${boost1.label})`, data.statsValues);
            finalData.stats[boost1.key] += boostVal1.value;
            addToSummary(`Boost Méga ${boost1.label}`, `+${boostVal1.value} (Total: ${finalData.stats[boost1.key]})`, true);
            if(currentMode !== 'rapide') await pause(PAUSE_DURATION);

            updateProgress(15);
            await waitManualClick();
            const boostVal2 = await spinWheel(`Boost (${boost2.label})`, data.statsValues);
            finalData.stats[boost2.key] += boostVal2.value;
            addToSummary(`Boost Méga ${boost2.label}`, `+${boostVal2.value} (Total: ${finalData.stats[boost2.key]})`, true);
            if(currentMode !== 'rapide') await pause(PAUSE_DURATION);
        }

        updateProgress(13);
        await waitManualClick();
        const shiny = await spinWheel("6. Shiny ?", data.shiny);
        finalData.isShiny = shiny.label === "Oui";
        if (finalData.isShiny) {
            addToSummary("Shiny", "✨ OUI ✨", true);
        } else {
            addToSummary("Shiny", "Non");
        }
        if(currentMode !== 'rapide') await pause(PAUSE_DURATION);
        
        titleElem.textContent = "Destinée Générée !";
        generateOutputs(finalData);
        
    } catch (e) {
        console.error(e);
        titleElem.textContent = "Erreur de tirage";
    } finally {
        btnGenerer.disabled = false;
        btnGenerer.classList.remove('opacity-50', 'cursor-not-allowed');
        progression.classList.add('hidden');
    }
}

function generateOutputs(d) {
    const totalStats = d.stats.hp + d.stats.atk + d.stats.def + d.stats.spa + d.stats.spd + d.stats.vit;
    const typeString = d.isDouble ? `${d.type1} et ${d.type2}` : d.type1;

    const csvHeader = "Rareté,Type 1,Type 2,PV,ATT,DEF,ATT.Spe,DEF.Spe,VIT,Total,Méga-Evo,Shiny";
    const csvRow = `${d.rarete},${d.type1},${d.type2},${d.stats.hp},${d.stats.atk},${d.stats.def},${d.stats.spa},${d.stats.spd},${d.stats.vit},${totalStats},${d.isMega ? 'Oui' : 'Non'},${d.isShiny ? 'Oui' : 'Non'}`;
    csvOutput.value = `${csvHeader}\n${csvRow}`;

    let prompt = `Génère moi un pokémon avec ses stats là :
- Rareté / Lignée : ${d.rarete}
- Type(s) : ${typeString}
- Base Stats Total : ${totalStats} (Profil : PV ${d.stats.hp}, ATK ${d.stats.atk}, DEF ${d.stats.def}, ATK SPE ${d.stats.spa}, DEF SPE ${d.stats.spd}, VIT ${d.stats.vit})`;

    if (d.isMega) prompt += `\n- Méga-Évolution (PS : Les stats de base sont déjà boostées.)`;
    if (d.isShiny) prompt += `\n- Shiny`;

    promptOutput.value = prompt;
    outputSection.classList.remove('hidden');
    
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 400]);
}


btnGenerer.addEventListener('click', () => lanceDestinee('auto'));
const btnRapide = document.getElementById('btn-rapide');
if(btnRapide) btnRapide.addEventListener('click', () => lanceDestinee('rapide'));
const btnManuel = document.getElementById('btn-manuel');
if(btnManuel) btnManuel.addEventListener('click', () => lanceDestinee('manuel'));

drawWheel(data.rarete);