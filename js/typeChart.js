// typeChart.js — Table des immunités/résistances/faiblesses (Gen 6+)
// ATK_CHART[attaquant][défenseur] = multiplicateur (1 implicite si absent)

const ATK_CHART = {
    Normal:     { Roche: 0.5, Acier: 0.5, Spectre: 0 },
    Feu:        { Plante: 2, Glace: 2, Insecte: 2, Acier: 2, Feu: 0.5, Eau: 0.5, Roche: 0.5, Dragon: 0.5 },
    Eau:        { Feu: 2, Sol: 2, Roche: 2, Eau: 0.5, Plante: 0.5, Dragon: 0.5 },
    Electrique: { Eau: 2, Vol: 2, Electrique: 0.5, Plante: 0.5, Dragon: 0.5, Sol: 0 },
    Plante:     { Eau: 2, Sol: 2, Roche: 2, Feu: 0.5, Plante: 0.5, Poison: 0.5, Vol: 0.5, Insecte: 0.5, Dragon: 0.5, Acier: 0.5 },
    Glace:      { Plante: 2, Sol: 2, Vol: 2, Dragon: 2, Feu: 0.5, Eau: 0.5, Glace: 0.5, Acier: 0.5 },
    Combat:     { Normal: 2, Glace: 2, Roche: 2, Ténèbres: 2, Acier: 2, Poison: 0.5, Vol: 0.5, Psy: 0.5, Insecte: 0.5, Fée: 0.5, Spectre: 0 },
    Poison:     { Plante: 2, Fée: 2, Poison: 0.5, Sol: 0.5, Roche: 0.5, Spectre: 0.5, Acier: 0 },
    Sol:        { Feu: 2, Electrique: 2, Poison: 2, Roche: 2, Acier: 2, Plante: 0.5, Insecte: 0.5, Vol: 0 },
    Roche:      { Feu: 2, Glace: 2, Vol: 2, Insecte: 2, Combat: 0.5, Sol: 0.5, Acier: 0.5 },
    Spectre:    { Spectre: 2, Psy: 2, Normal: 0, Ténèbres: 0.5 },
    Dragon:     { Dragon: 2, Acier: 0.5, Fée: 0 },
    Ténèbres:   { Spectre: 2, Psy: 2, Ténèbres: 0.5, Combat: 0.5, Fée: 0.5 },
    Vol:        { Plante: 2, Combat: 2, Insecte: 2, Electrique: 0.5, Roche: 0.5, Acier: 0.5 },
    Insecte:    { Plante: 2, Psy: 2, Ténèbres: 2, Feu: 0.5, Combat: 0.5, Vol: 0.5, Spectre: 0.5, Acier: 0.5, Fée: 0.5 },
    Acier:      { Glace: 2, Roche: 2, Fée: 2, Feu: 0.5, Eau: 0.5, Electrique: 0.5, Acier: 0.5 },
    Psy:        { Combat: 2, Poison: 2, Psy: 0.5, Acier: 0.5, Ténèbres: 0 },
    Fée:        { Combat: 2, Dragon: 2, Ténèbres: 2, Feu: 0.5, Poison: 0.5, Acier: 0.5 },
};

const ALL_TYPES = ['Normal','Feu','Eau','Electrique','Plante','Glace','Combat','Poison',
                   'Sol','Roche','Spectre','Dragon','Ténèbres','Vol','Insecte','Acier','Psy','Fée'];

// Retourne { 4: [...], 2: [...], 0.5: [...], 0.25: [...], 0: [...] }
function computeWeaknesses(type1, type2) {
    const hasType2 = type2 && type2 !== 'Aucun';
    const groups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
    ALL_TYPES.forEach(att => {
        const m1 = ATK_CHART[att]?.[type1]  ?? 1;
        const m2 = hasType2 ? (ATK_CHART[att]?.[type2] ?? 1) : 1;
        const total = m1 * m2;
        if (total !== 1) {
            const key = total >= 4 ? 4 : total >= 2 ? 2 : total === 0 ? 0 : total <= 0.25 ? 0.25 : 0.5;
            groups[key].push(att);
        }
    });
    return groups;
}
