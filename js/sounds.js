// sounds.js — Sons de la Roue du Destin
// Tout généré via Web Audio API, aucun fichier audio externe.

let _audioCtx = null;
let _isMuted   = localStorage.getItem('roue-muted') === '1';
let _lastTick  = 0; // throttle : évite de saturer avec trop de ticks

function _ctx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
}

// Déverrouille l'AudioContext dès le premier clic (requis par les navigateurs modernes)
document.addEventListener('click', function _unlockAudio() {
    _ctx();
    document.removeEventListener('click', _unlockAudio);
}, { once: true });

function toggleMute() {
    _isMuted = !_isMuted;
    localStorage.setItem('roue-muted', _isMuted ? '1' : '0');
    return _isMuted;
}

// Tick pendant la rotation (un clic par segment croisé)
function playTick() {
    if (_isMuted) return;
    const now = performance.now();
    if (now - _lastTick < 30) return; // max ~33 ticks/s
    _lastTick = now;

    const ctx = _ctx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = 700;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.045);
}

// Ding quand la roue s'arrête et révèle un résultat
function playReveal() {
    if (_isMuted) return;
    const ctx = _ctx();
    const t = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const s = t + i * 0.1;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.25, s + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.35);
        osc.start(s);
        osc.stop(s + 0.35);
    });
}

// Arpège montant pour un résultat Shiny
function playShiny() {
    if (_isMuted) return;
    const ctx = _ctx();
    [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const s = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.2, s + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
        osc.start(s);
        osc.stop(s + 0.25);
    });
}

// Fanfare Do-Mi-Sol-Do à la fin du tirage complet
function playFanfare() {
    if (_isMuted) return;
    const ctx = _ctx();
    [
        { freq: 523.25, t: 0,    dur: 0.12 },
        { freq: 659.25, t: 0.13, dur: 0.12 },
        { freq: 783.99, t: 0.26, dur: 0.12 },
        { freq: 1046.5, t: 0.39, dur: 0.5  },
    ].forEach(({ freq, t, dur }) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const s = ctx.currentTime + t;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.3, s + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, s + dur);
        osc.start(s);
        osc.stop(s + dur);
    });
}

// Initialise le bouton mute avec l'état sauvegardé
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-son');
    if (btn) btn.textContent = _isMuted ? '🔇' : '🔊';
});
