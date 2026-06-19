// peer.js — Multijoueur WebRTC via PeerJS
// Protocole unidirectionnel : l'hôte envoie chaque résultat de spin au guest,
// qui rejoue la même animation en appelant spinWheel() avec forcedWinner.

let peerRole = null; // 'host' | 'guest' | null  — lisible depuis app.js / draft.js
let peerConn = null; // DataChannel actif
let _peer    = null; // instance PeerJS

// ── File d'attente des spins côté guest ───────────────────────────────────────
// Le host peut envoyer des spins plus vite que le guest les anime (mode rapide).
const _guestQueue = [];
let   _guestBusy  = false;

async function _processGuestQueue() {
    if (_guestBusy) return;
    _guestBusy = true;
    while (_guestQueue.length) {
        const msg = _guestQueue.shift();
        if (msg.type === 'spin') {
            currentMode = msg.mode || 'auto';
            const winner = msg.items.find(o => o.label === msg.result) || msg.items[msg.items.length - 1];
            await spinWheel(msg.title, msg.items, msg.isType, winner);
            if (currentMode === 'auto') await pause(PAUSE_DURATION);
        }
    }
    _guestBusy = false;
}

// ── Envoi vers le pair ────────────────────────────────────────────────────────
function peerSend(msg) {
    if (peerConn && peerConn.open) peerConn.send(JSON.stringify(msg));
}

// ── Connexion établie côté host ───────────────────────────────────────────────
function _onHostConnected(conn) {
    peerConn = conn;
    conn.on('close', _onDisconnected);
    conn.on('error', _onDisconnected);
    conn.on('open', () => {
        _setStatus('✅ Joueur connecté !', 'green');
        const waiting = document.getElementById('peer-guest-status');
        if (waiting) { waiting.textContent = '✅ Joueur connecté !'; waiting.className = 'text-green-400 text-xs mt-2'; }
    });
}

// ── Connexion établie côté guest ──────────────────────────────────────────────
function _onGuestConnected(conn) {
    peerConn = conn;
    conn.on('data', raw => { _guestQueue.push(JSON.parse(raw)); _processGuestQueue(); });
    conn.on('close', _onDisconnected);
    conn.on('error', _onDisconnected);
    _setStatus('✅ Connecté à l\'hôte !', 'green');
    _disableControlsForGuest();
}

function _onDisconnected() {
    peerConn = null;
    _setStatus('⚠️ Déconnecté. Rechargez la page pour recommencer.', 'red');
}

function _setStatus(text, color) {
    const el = document.getElementById('peer-status');
    if (!el) return;
    el.textContent = text;
    el.className = `text-xs mt-2 text-${color}-400`;
    el.classList.remove('hidden');
}

function _disableControlsForGuest() {
    ['btn-generer', 'btn-rapide', 'btn-manuel', 'btn-draft-toggle'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = true;
        el.classList.add('opacity-40', 'pointer-events-none');
    });
    // Bannière visuelle
    const banner = document.createElement('div');
    banner.id = 'peer-guest-banner';
    banner.className = 'w-full max-w-sm text-center bg-teal-900/40 border border-teal-700 rounded-xl py-2 px-4 mb-4 text-teal-300 text-sm';
    banner.textContent = '👁 Mode Invité — les roues s\'animent automatiquement';
    const ref = document.getElementById('peer-panel');
    ref?.insertAdjacentElement('afterend', banner);
}

// ── Bindings UI ───────────────────────────────────────────────────────────────
(function () {
    const btnMulti  = document.getElementById('btn-multi');
    const peerPanel = document.getElementById('peer-panel');
    const peerChoice = document.getElementById('peer-choice');

    btnMulti?.addEventListener('click', () => peerPanel.classList.toggle('hidden'));

    // --- Créer une session (hôte) ---
    document.getElementById('peer-create-btn')?.addEventListener('click', function () {
        this.disabled = true;
        this.textContent = '⏳ Connexion…';
        peerChoice.classList.add('hidden');
        peerRole = 'host';

        _peer = new Peer();

        _peer.on('open', id => {
            const codeEl = document.getElementById('peer-room-code');
            if (codeEl) codeEl.textContent = id;
            document.getElementById('peer-host-ui')?.classList.remove('hidden');
        });

        _peer.on('connection', conn => _onHostConnected(conn));

        _peer.on('error', e => {
            _setStatus('Erreur PeerJS : ' + e.type, 'red');
            peerChoice.classList.remove('hidden');
            this.disabled = false;
            this.textContent = '🏠 Créer une session';
            peerRole = null;
        });
    });

    // --- Afficher le champ "rejoindre" ---
    document.getElementById('peer-join-open-btn')?.addEventListener('click', () => {
        peerChoice.classList.add('hidden');
        document.getElementById('peer-join-ui')?.classList.remove('hidden');
    });

    // --- Rejoindre en tant que guest ---
    document.getElementById('peer-join-btn')?.addEventListener('click', function () {
        const hostId = document.getElementById('peer-code-input')?.value.trim();
        if (!hostId) return;
        this.disabled = true;
        this.textContent = '⏳…';
        peerRole = 'guest';

        _peer = new Peer();

        _peer.on('open', () => {
            const conn = _peer.connect(hostId);
            peerConn = conn;
            conn.on('open',  () => _onGuestConnected(conn));
            conn.on('close', _onDisconnected);
            conn.on('error', _onDisconnected);
        });

        _peer.on('error', e => {
            _setStatus('Impossible de rejoindre : ' + e.type, 'red');
            this.disabled = false;
            this.textContent = 'Rejoindre';
            peerRole = null;
        });
    });

    // --- Copier le code de session ---
    document.getElementById('peer-copy-code')?.addEventListener('click', function () {
        const code = document.getElementById('peer-room-code')?.textContent || '';
        navigator.clipboard?.writeText(code);
        const orig = this.textContent;
        this.textContent = '✅ Copié !';
        setTimeout(() => { this.textContent = orig; }, 2000);
    });
})();
