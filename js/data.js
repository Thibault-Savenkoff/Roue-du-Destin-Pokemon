export const defaultData = {
    rarete: [
        { label: "Aucun", percentage: 46 },
        { label: "Starter", percentage: 30 },
        { label: "Fabuleux", percentage: 15 },
        { label: "Légendaire", percentage: 9 }
    ],
    doubleType: [
        { label: "Oui", percentage: 33 },
        { label: "Non", percentage: 67 }
    ],
    types: [
        { label: "Vol", percentage: 5.5 },
        { label: "Ténèbres", percentage: 5.5 },
        { label: "Spectre", percentage: 5.5 },
        { label: "Sol", percentage: 5.5 },
        { label: "Roche", percentage: 5.5 },
        { label: "Psy", percentage: 5.5 },
        { label: "Poison", percentage: 5.5 },
        { label: "Plante", percentage: 5.5 },
        { label: "Normal", percentage: 5.5 },
        { label: "Insecte", percentage: 5.5 },
        { label: "Glace", percentage: 5.5 },
        { label: "Feu", percentage: 5.5 },
        { label: "Fée", percentage: 5.5 },
        { label: "Electrique", percentage: 5.5 },
        { label: "Eau", percentage: 5.5 },
        { label: "Dragon", percentage: 5.5 },
        { label: "Combat", percentage: 5.5 },
        { label: "Acier", percentage: 6.5 }
    ],
    statsValues: [
        { label: "1", percentage: 5.5, value: 1 },
        { label: "10", percentage: 5.5, value: 10 },
        { label: "20", percentage: 5.5, value: 20 },
        { label: "30", percentage: 5.5, value: 30 },
        { label: "40", percentage: 5.5, value: 40 },
        { label: "45", percentage: 5.5, value: 45 },
        { label: "50", percentage: 5.5, value: 50 },
        { label: "55", percentage: 5.5, value: 55 },
        { label: "60", percentage: 5.5, value: 60 },
        { label: "65", percentage: 5.5, value: 65 },
        { label: "70", percentage: 5.5, value: 70 },
        { label: "75", percentage: 5.5, value: 75 },
        { label: "80", percentage: 5.5, value: 80 },
        { label: "90", percentage: 5.5, value: 90 },
        { label: "100", percentage: 5.5, value: 100 },
        { label: "110", percentage: 5.5, value: 110 },
        { label: "125", percentage: 5.5, value: 125 },
        { label: "150", percentage: 6.5, value: 150 }
    ],
    statsNames: [
        { label: "PV", percentage: 16.6, key: "hp" },
        { label: "ATT", percentage: 16.6, key: "atk" },
        { label: "DEF", percentage: 16.6, key: "def" },
        { label: "ATT. Spe", percentage: 16.6, key: "spa" },
        { label: "DEF. Spe", percentage: 16.6, key: "spd" },
        { label: "VIT", percentage: 17.0, key: "vit" }
    ],
    mega: [
        { label: "Oui", percentage: 15 },
        { label: "Non", percentage: 85 }
    ],
    shiny: [
        { label: "Oui", percentage: 5 },
        { label: "Non", percentage: 95 }
    ]
};

export const data = JSON.parse(localStorage.getItem('roue-data')) || defaultData;

// Fonction utilitaire pour tirer un élément aléatoire selon son pourcentage
export function getRandomWeighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.percentage !== undefined ? item.percentage : item.weight), 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
        let w = item.percentage !== undefined ? item.percentage : item.weight;
        if (random < w) {
            return item;
        }
        random -= w;
    }
    return items[items.length - 1]; // Fallback
}
