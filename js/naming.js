// naming.js — Générateur de nom de Fakemon par type

const _NAME_SYLLABLES = {
    Feu:        ['Bra','Vol','Cra','Fla','Cin','Ar','Ign','Bra','Vul'],
    Eau:        ['Aqu','Mar','Ond','Cor','Thal','Mer','Nav','Del'],
    Plante:     ['Flo','Her','Verd','Fern','Sylv','Bot','Pyr','Lau'],
    Electrique: ['Volt','Lek','Ful','Nik','Zap','Pio','Amp'],
    Glace:      ['Cryo','Gel','Frig','Alg','Bor','Nev','Pol'],
    Combat:     ['Bras','Pug','Krak','Vig','Typh','Bel'],
    Poison:     ['Tox','Vip','Mor','Ven','Spor','Mal','Cor'],
    Sol:        ['Ter','Sab','Dun','Arg','Geo','Tell','Grav'],
    Vol:        ['Aer','Vent','Zyph','Gal','Aquil','Fal'],
    Psy:        ['Psi','Noo','Ment','Eso','Lux','Tél'],
    Insecte:    ['Chi','Bug','Larv','Acar','Chryph','Mant'],
    Roche:      ['Roc','Cal','Pet','Grav','Lith','Marm'],
    Spectre:    ['Phan','Nec','Spect','Umbr','Sha','Mori'],
    Dragon:     ['Draco','Ryuu','Drag','Lind','Wyv','Serp'],
    Ténèbres:   ['Nox','Umbr','Shad','Mal','Nyx','Atr'],
    Acier:      ['Fer','Met','Kal','Acier','Titan','Crom'],
    Fée:        ['Cel','Lun','Elf','Syl','Merv','Iri'],
    Normal:     ['Mon','Com','Plain','Vul','Ori','Bel'],
};

const _ENDINGS = ['on','us','ix','or','al','eon','ion','ara','el','os','ex','ir','ax','um','yx','iel'];

function generateFakemonName(type1) {
    const pool = _NAME_SYLLABLES[type1] || _NAME_SYLLABLES.Normal;
    const syl1 = pool[Math.floor(Math.random() * pool.length)];
    const end  = _ENDINGS[Math.floor(Math.random() * _ENDINGS.length)];
    // 25% chance d'ajouter une syllabe médiane pour rallonger le nom
    if (Math.random() < 0.25) {
        const pool2 = _NAME_SYLLABLES[type1] || _NAME_SYLLABLES.Normal;
        let mid = pool2[Math.floor(Math.random() * pool2.length)].toLowerCase();
        if (mid === syl1.toLowerCase()) mid = 'ra'; // évite doublon
        return syl1 + mid + end;
    }
    return syl1 + end;
}
