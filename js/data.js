// =============================================================================
// data.js — Données de configuration de la Roue du Destin
//
// Ce fichier définit TOUTES les roues du jeu sous forme de tableaux d'objets
// { label, percentage }. Les pourcentages représentent les poids relatifs :
// une entrée à 30% a 3× plus de chances d'être tirée qu'une entrée à 10%.
//
// Les données peuvent être modifiées par l'utilisateur depuis settings.html
// et sont alors persistées dans localStorage sous la clé 'roue-data'.
// À chaque chargement, on préfère les données localStorage aux valeurs par défaut.
// =============================================================================

// ── Données par défaut ────────────────────────────────────────────────────────
// Exporté séparément pour permettre la réinitialisation depuis settings.js
export const defaultData = {

    // Rareté de la lignée du Fakemon (influence son "niveau" dans l'univers)
    rarete: [
        { label: "Aucun",      percentage: 46 }, // Pokémon commun, pas de lignée spéciale
        { label: "Starter",    percentage: 30 }, // Pokémon de départ
        { label: "Fabuleux",   percentage: 15 }, // Pseudo-légendaire / UB
        { label: "Légendaire", percentage:  9 }  // Légendaire / Mythique
    ],

    // Détermine si le Fakemon aura un ou deux types
    doubleType: [
        { label: "Oui", percentage: 33 }, // 1 chance sur 3 d'avoir un second type
        { label: "Non", percentage: 67 }
    ],

    // Les 18 types Pokémon avec leurs probabilités
    // L'Acier et le Normal ont un léger surplus (+1%) pour compenser
    // leur sous-représentation dans les combos doubles
    types: [
        { label: "Vol",        percentage: 5.5 },
        { label: "Ténèbres",   percentage: 5.5 },
        { label: "Spectre",    percentage: 5.5 },
        { label: "Sol",        percentage: 5.5 },
        { label: "Roche",      percentage: 5.5 },
        { label: "Psy",        percentage: 5.5 },
        { label: "Poison",     percentage: 5.5 },
        { label: "Plante",     percentage: 5.5 },
        { label: "Normal",     percentage: 5.5 },
        { label: "Insecte",    percentage: 5.5 },
        { label: "Glace",      percentage: 5.5 },
        { label: "Feu",        percentage: 5.5 },
        { label: "Fée",        percentage: 5.5 },
        { label: "Electrique", percentage: 5.5 },
        { label: "Eau",        percentage: 5.5 },
        { label: "Dragon",     percentage: 5.5 },
        { label: "Combat",     percentage: 5.5 },
        { label: "Acier",      percentage: 6.5 }  // Légèrement surpondéré
    ],

    // Valeurs possibles pour chaque stat de base (HP, ATK, DEF, SPA, SPD, VIT)
    // La distribution est quasi-uniforme ; 150 est légèrement surpondéré (stat plafond)
    // Chaque objet a aussi une propriété `value` (nombre) utilisée pour les calculs
    statsValues: [
        { label: "1",   percentage: 5.5, value: 1   },
        { label: "10",  percentage: 5.5, value: 10  },
        { label: "20",  percentage: 5.5, value: 20  },
        { label: "30",  percentage: 5.5, value: 30  },
        { label: "40",  percentage: 5.5, value: 40  },
        { label: "45",  percentage: 5.5, value: 45  },
        { label: "50",  percentage: 5.5, value: 50  },
        { label: "55",  percentage: 5.5, value: 55  },
        { label: "60",  percentage: 5.5, value: 60  },
        { label: "65",  percentage: 5.5, value: 65  },
        { label: "70",  percentage: 5.5, value: 70  },
        { label: "75",  percentage: 5.5, value: 75  },
        { label: "80",  percentage: 5.5, value: 80  },
        { label: "90",  percentage: 5.5, value: 90  },
        { label: "100", percentage: 5.5, value: 100 },
        { label: "110", percentage: 5.5, value: 110 },
        { label: "125", percentage: 5.5, value: 125 },
        { label: "150", percentage: 6.5, value: 150 }  // Stat maximale, légèrement surpondérée
    ],

    // Noms des 6 stats de base + clé interne utilisée dans finalData.stats
    statsNames: [
        { label: "PV",      percentage: 16.6, key: "hp"  },
        { label: "ATT",     percentage: 16.6, key: "atk" },
        { label: "DEF",     percentage: 16.6, key: "def" },
        { label: "ATT. Spe",percentage: 16.6, key: "spa" },
        { label: "DEF. Spe",percentage: 16.6, key: "spd" },
        { label: "VIT",     percentage: 17.0, key: "vit" }  // Légèrement surpondéré pour équilibrer à 100%
    ],

    // Chance d'avoir une Méga-Évolution (15% par défaut)
    mega: [
        { label: "Oui", percentage: 15 },
        { label: "Non", percentage: 85 }
    ],

    // Chance d'être un Pokémon Shiny (5% par défaut, fidèle à l'esprit des jeux)
    shiny: [
        { label: "Oui", percentage:  5 },
        { label: "Non", percentage: 95 }
    ]
};

// ── Données actives ────────────────────────────────────────────────────────────
// Si l'utilisateur a personnalisé les probabilités depuis settings.html,
// elles sont lues depuis localStorage (clé 'roue-data').
// Sinon, on utilise defaultData.
// C'est cet export `data` qu'app.js utilise pour tous les tirages.
export const data = JSON.parse(localStorage.getItem('roue-data')) || defaultData;

// ── Tirage pondéré ─────────────────────────────────────────────────────────────
/**
 * Tire un élément aléatoire dans un tableau d'options pondérées.
 * Fonctionne avec des objets ayant soit une propriété `percentage` soit `weight`.
 *
 * Algorithme : on calcule le poids total, on tire un nombre aléatoire entre 0 et ce
 * total, puis on soustrait les poids un par un jusqu'à "tomber" dans une tranche.
 * Complexité O(n), suffisant pour des tableaux de <20 éléments.
 *
 * @param {Array} items - Tableau d'objets { label, percentage } ou { label, weight }
 * @returns {Object}    - L'élément tiré au sort
 */
export function getRandomWeighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.percentage !== undefined ? item.percentage : item.weight), 0);
    let random = Math.random() * totalWeight; // Nombre entre 0 et totalWeight

    for (const item of items) {
        let w = item.percentage !== undefined ? item.percentage : item.weight;
        if (random < w) {
            return item; // Ce nombre tombe dans la "tranche" de cet item
        }
        random -= w; // Soustrait le poids et continue vers la tranche suivante
    }

    return items[items.length - 1]; // Fallback théorique (erreurs d'arrondi flottant)
}