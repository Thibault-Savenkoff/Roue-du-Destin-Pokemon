/**
 * settings.js
 * Gère la page de paramètres de la Roue du Destin.
 *
 * Fonctionnement général :
 *  - Importe les données actuelles (data) et les données par défaut (defaultData) depuis data.js.
 *  - Génère dynamiquement un formulaire avec les pourcentages de chaque catégorie.
 *  - Permet de sauvegarder les modifications dans le localStorage ou de réinitialiser aux valeurs par défaut.
 */

// Importation des données depuis le module data.js :
//   - defaultData : les valeurs de pourcentage d'origine (non modifiables)
//   - data        : les données courantes (depuis localStorage si elles existent, sinon defaultData)

// Référence au conteneur HTML dans lequel les sections de paramètres seront injectées
const container = document.getElementById('settings-container');
// Référence au bouton "Sauvegarder"
const btnSave = document.getElementById('btn-save');
// Référence au bouton "Réinitialiser"
const btnReset = document.getElementById('btn-reset');

// --- Confetti settings UI (mode + intensity) ---
function renderConfettiControls() {
    // Read saved values or defaults
    const savedMode = localStorage.getItem('confetti.mode') || 'auto';
    const savedIntensity = localStorage.getItem('confetti.intensity') || '100';

    const confettiSection = document.createElement('div');
    confettiSection.classList.add('bg-slate-900', 'p-3', 'rounded-xl', 'border', 'border-slate-700');

    const title = document.createElement('h3');
    title.classList.add('font-bold', 'text-yellow-400', 'uppercase', 'tracking-wider', 'text-sm', 'mb-3');
    title.textContent = 'Confetti (Mode & Intensité)';
    confettiSection.appendChild(title);

    // Mode selector
    const modeRow = document.createElement('div');
    modeRow.classList.add('flex', 'items-center', 'justify-between', 'mb-3');
    const modeLabel = document.createElement('span');
    modeLabel.textContent = 'Mode';
    modeLabel.classList.add('text-slate-300');
    const modeSelect = document.createElement('select');
    modeSelect.classList.add('bg-slate-800', 'text-white', 'rounded', 'p-1', 'border', 'border-slate-600');
    ['auto','canvas','dom'].forEach(m => {
        const opt = document.createElement('option'); opt.value = m; opt.text = m.charAt(0).toUpperCase() + m.slice(1);
        if (m === savedMode) opt.selected = true;
        modeSelect.appendChild(opt);
    });
    modeSelect.addEventListener('change', (e) => {
        localStorage.setItem('confetti.mode', e.target.value);
    });
    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeSelect);
    confettiSection.appendChild(modeRow);

    // Intensity slider
    const intensityRow = document.createElement('div');
    intensityRow.classList.add('flex', 'items-center', 'justify-between', 'gap-3');
    const intensityLabel = document.createElement('span');
    intensityLabel.textContent = 'Intensité';
    intensityLabel.classList.add('text-slate-300');
    const intensityWrapper = document.createElement('div');
    intensityWrapper.classList.add('flex', 'items-center', 'gap-2');
    const intensityInput = document.createElement('input');
    intensityInput.type = 'range'; intensityInput.min = '0'; intensityInput.max = '100'; intensityInput.value = savedIntensity;
    intensityInput.classList.add('w-36');
    const intensityValue = document.createElement('span'); intensityValue.textContent = `${savedIntensity}%`;
    intensityValue.classList.add('text-slate-300', 'text-sm');
    intensityInput.addEventListener('input', (e) => {
        intensityValue.textContent = `${e.target.value}%`;
    });
    intensityInput.addEventListener('change', (e) => {
        localStorage.setItem('confetti.intensity', String(e.target.value));
    });
    intensityWrapper.appendChild(intensityInput);
    intensityWrapper.appendChild(intensityValue);
    intensityRow.appendChild(intensityLabel);
    intensityRow.appendChild(intensityWrapper);
    confettiSection.appendChild(intensityRow);

    // Test button (opens index page with preview param)
    const testBtn = document.createElement('button');
    testBtn.classList.add('mt-3', 'w-full', 'bg-blue-600', 'hover:bg-blue-700', 'text-white', 'py-2', 'rounded');
    testBtn.textContent = '▶ Tester confetti (ouvrir la page principale)';
    testBtn.addEventListener('click', () => {
        // Ensure current values are saved, then open index.html with preview param
        if (modeSelect && intensityInput) {
            localStorage.setItem('confetti.mode', modeSelect.value);
            localStorage.setItem('confetti.intensity', String(intensityInput.value));
        }
        window.open('index.html?previewConfetti=1', '_blank');
    });
    confettiSection.appendChild(testBtn);

    // Insert the confetti section at the top of the container
    container.insertAdjacentElement('afterbegin', confettiSection);
}

// Copie profonde des données courantes pour permettre l'édition sans modifier l'original.
// On utilise JSON.parse(JSON.stringify(...)) car les données contiennent des objets imbriqués.
let editingData = JSON.parse(JSON.stringify(data));

/**
 * render()
 * Vide et reconstruit entièrement le formulaire dans #settings-container.
 * Appelée au chargement de la page et à chaque modification d'une valeur
 * (pour recalculer le total affiché).
 */
function render() {
    // Vide le conteneur avant de le re-remplir
    container.innerHTML = '';

    // Rend les contrôles de confetti en haut
    renderConfettiControls();

    // Conteneur temporaire pour les sections de catégories (afin de préserver les controles en haut)
    const categoriesParent = document.createElement('div');

    // Itère sur chaque catégorie de editingData (ex: "typePrimaire", "région", etc.)
    for (const [category, items] of Object.entries(editingData)) {
        // === Création de la section pour cette catégorie ===
        const section = document.createElement('div');
        section.classList.add('bg-slate-900', 'p-3', 'rounded-xl', 'border', 'border-slate-700');

        // Titre de la catégorie : transforme le camelCase en mots séparés
        // ex: "typePrimaire" → "type Primaire"
        const title = document.createElement('h3');
        title.classList.add('font-bold', 'text-yellow-400', 'uppercase', 'tracking-wider', 'text-sm', 'mb-3');
        title.textContent = category.replace(/([A-Z])/g, ' $1').trim();
        section.appendChild(title);

        // Conteneur de la liste des items de cette catégorie
        const list = document.createElement('div');
        list.classList.add('space-y-2');

        // Accumulateur pour calculer le total des pourcentages de la catégorie
        let total = 0;

        // === Itère sur chaque item (ex: { label: "Feu", percentage: 14.3 }) ===
        items.forEach((item, index) => {
            // Récupère la valeur de pourcentage (supporte les propriétés "percentage" et "weight")
            let itemPerc = item.percentage !== undefined ? item.percentage : item.weight;
            total += Number(itemPerc);

            // Ligne (row) : affiche le label à gauche et le champ de saisie à droite
            const row = document.createElement('div');
            row.classList.add('flex', 'justify-between', 'items-center', 'text-sm');

            // Label de l'item (ex: "Feu", "Eau", "Kanto"…)
            const label = document.createElement('span');
            label.textContent = item.label;
            label.classList.add('text-slate-300');

            // Wrapper pour le champ de saisie + symbole "%"
            const inputWrapper = document.createElement('div');
            inputWrapper.classList.add('flex', 'items-center', 'gap-1');

            // Champ numérique permettant de modifier le pourcentage de l'item
            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.1';   // Incrément de 0.1%
            input.min = '0';      // Valeur minimale : 0%
            input.value = itemPerc;
            input.classList.add('w-16', 'bg-slate-800', 'text-white', 'text-center', 'rounded', 'border', 'border-slate-600', 'p-1', 'focus:border-yellow-400', 'focus:outline-none');

            // Mise à jour de editingData et re-rendu quand l'utilisateur change la valeur
            input.addEventListener('change', (e) => {
                // Met à jour le pourcentage dans la copie locale des données
                editingData[category][index].percentage = parseFloat(e.target.value) || 0;
                // Re-rend le formulaire pour recalculer et afficher le nouveau total
                render();
            });

            // Symbole "%" affiché juste après le champ de saisie
            const percentSign = document.createElement('span');
            percentSign.textContent = '%';
            percentSign.classList.add('text-slate-500', 'text-xs');

            inputWrapper.appendChild(input);
            inputWrapper.appendChild(percentSign);

            row.appendChild(label);
            row.appendChild(inputWrapper);
            list.appendChild(row);
        });

        // === Affichage du total des pourcentages de la catégorie ===
        const totalDisplay = document.createElement('div');
        totalDisplay.classList.add('text-right', 'text-xs', 'pt-2', 'mt-2', 'border-t', 'border-slate-700', 'font-bold');
        totalDisplay.textContent = `Total: ${total.toFixed(1)}%`;

        // Couleur rouge si le total s'écarte de 100% (tolérance de ±0.1),
        // verte si le total est valide (exactement 100%)
        if (Math.abs(total - 100) > 0.1) {
            totalDisplay.classList.add('text-red-400');
        } else {
            totalDisplay.classList.add('text-green-400');
        }
        list.appendChild(totalDisplay);

        section.appendChild(list);
        categoriesParent.appendChild(section);
    }

    // Append categories after confetti controls
    container.appendChild(categoriesParent);
}

// === SAUVEGARDE ===
// Enregistre editingData dans le localStorage sous la clé 'roue-data',
// puis affiche un feedback visuel temporaire ("✅ Sauvegardé !") pendant 1,5 seconde.
btnSave.addEventListener('click', () => {
    localStorage.setItem('roue-data', JSON.stringify(editingData));

    // Sauvegarde le texte original du bouton pour le restaurer après le feedback
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = "✅ Sauvegardé !";
    btnSave.classList.replace('bg-green-500', 'bg-emerald-600');

    setTimeout(() => {
        btnSave.innerHTML = originalText;
        btnSave.classList.replace('bg-emerald-600', 'bg-green-500');
    }, 1500);
});

// === RÉINITIALISATION ===
// Demande une confirmation à l'utilisateur, puis :
//  1. Supprime la clé 'roue-data' du localStorage
//  2. Recharge les données par défaut dans editingData
//  3. Re-rend le formulaire avec les valeurs d'origine
btnReset.addEventListener('click', () => {
    if (confirm('Tout réinitialiser par défaut ?')) {
        localStorage.removeItem('roue-data');
        editingData = JSON.parse(JSON.stringify(defaultData));
        render();

        const originalHTML = btnReset.innerHTML;
        btnReset.innerHTML = "✅ Réinitialisé !";
        setTimeout(() => { btnReset.innerHTML = originalHTML; }, 1500);
    }
});

// === INITIALISATION ===
// Premier rendu du formulaire au chargement de la page
render();