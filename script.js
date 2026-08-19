// ================= CONFIGURATION =================
// Colle ton URL Google Apps Script ici
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbyLbLAN2so-FRGtIHLinHITpA2DoN3cy_0gUSwXHteCzydxQUJK9wMaDCvRkImKPWcT/exec";

// Temps d'affichage par message (5 secondes)
const DISPLAY_TIME = 5000;
// Temps de vérification des nouveaux messages (3 secondes)
const POLLING_TIME = 3000;

// ================= VARIABLES =================
let allMessages = [];        // Historique complet
let newMessagesQueue = [];   // File d'attente prioritaire
let isInitialized = false;   // Premier chargement effectué ?

// Éléments du DOM
const tickerElement = document.getElementById('ticker-content');
const video = document.getElementById('bg-video');
const overlay = document.getElementById('overlay-depart');
const textarea = document.getElementById('dedicaceInput');
const emailField = document.getElementById('emailInput');
const statut = document.getElementById('statut');

// Éléments Audio
const soundBtn = document.getElementById('sound-btn');
const soundControl = document.getElementById('sound-control');
const volumeSlider = document.getElementById('volume-slider');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');
let lastVolume = 1;
let hideSoundTimeout;

// ================= GESTION DE LA VIDEO (MOBILE / DESKTOP) =================
function updateVideoSource() {
    if (!video) return;
    const isMobile = window.innerWidth <= 768;
    const targetFile = isMobile ? 'mika vertical.mp4' : 'Lenvrs Week of colors Mika.mp4';
    const targetSrc = './content/' + targetFile;
    
    // Vérification de la source actuelle
    const currentSrc = video.currentSrc || video.src || '';
    if (!decodeURIComponent(currentSrc).includes(targetFile)) {
        const wasPlaying = !video.paused;
        video.src = targetSrc;
        video.load();
        if (wasPlaying) {
            video.play().catch(() => {});
        }
    }
}

// Initialisation immédiate
updateVideoSource();
window.addEventListener('resize', updateVideoSource);
window.addEventListener('orientationchange', updateVideoSource);

// ================= GESTION DU SON & DISPARITION 2s =================
function updateSoundUI(isMuted, volume) {
    if (!iconSoundOn || !iconSoundOff || !volumeSlider) return;
    if (isMuted || volume === 0) {
        iconSoundOn.classList.add('sound-icon-hidden');
        iconSoundOff.classList.remove('sound-icon-hidden');
        volumeSlider.value = 0;
    } else {
        iconSoundOff.classList.add('sound-icon-hidden');
        iconSoundOn.classList.remove('sound-icon-hidden');
        volumeSlider.value = volume;
    }
}

function toggleSound() {
    if (!video) return;
    if (video.muted || video.volume === 0) {
        video.muted = false;
        video.volume = (lastVolume > 0) ? lastVolume : 1;
        updateSoundUI(false, video.volume);
    } else {
        lastVolume = video.volume > 0 ? video.volume : 1;
        video.muted = true;
        updateSoundUI(true, 0);
    }
}

function setVolume(val) {
    if (!video) return;
    const num = parseFloat(val);
    video.volume = num;
    if (num === 0) {
        video.muted = true;
        updateSoundUI(true, 0);
    } else {
        video.muted = false;
        lastVolume = num;
        updateSoundUI(false, num);
    }
}

// Fonction pour afficher le mélangeur et le masquer automatiquement après 2 secondes
function showSoundControl() {
    if (!soundControl) return;
    soundControl.classList.add('active');
    clearTimeout(hideSoundTimeout);
    hideSoundTimeout = setTimeout(() => {
        soundControl.classList.remove('active');
    }, 2000); // Disparaît précisément au bout de 2 secondes
}

if (video && soundControl) {
    // Événements sur la vidéo
    video.addEventListener('mousemove', showSoundControl);
    video.addEventListener('mouseenter', showSoundControl);
    video.addEventListener('touchstart', showSoundControl, { passive: true });
    video.addEventListener('click', showSoundControl);
    
    // Événements sur le widget de son
    soundControl.addEventListener('mousemove', showSoundControl);
    soundControl.addEventListener('mouseenter', showSoundControl);
    soundControl.addEventListener('touchstart', showSoundControl, { passive: true });
}

if (soundBtn) {
    soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSound();
        showSoundControl();
    });
}

if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        setVolume(e.target.value);
        showSoundControl();
    });
    volumeSlider.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    volumeSlider.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        showSoundControl();
    }, { passive: true });
}

// ================= FONCTIONS D'AFFICHAGE (LECTURE) =================

// 1. Récupérer les messages depuis Google Sheets
async function fetchMessages() {
    try {
        const response = await fetch(URL_SCRIPT);
        const data = await response.json();

        if (!isInitialized) {
            // Premier chargement : on prend tout sans priorité
            allMessages = data;
            isInitialized = true;
            showNextMessage(); // Affiche le premier message tout de suite
            setInterval(showNextMessage, DISPLAY_TIME); // Lance la boucle d'affichage
        } else {
            // Vérification des nouveaux messages
            if (data.length > allMessages.length) {
                // Calcul combien de nouveaux messages sont arrivés
                const newItemsCount = data.length - allMessages.length;
                // On récupère uniquement les derniers
                const brandNewMessages = data.slice(-newItemsCount);

                // On met à jour la liste globale
                allMessages = data;

                // On ajoute les nouveaux dans la file PRIORITAIRE
                brandNewMessages.forEach(msg => {
                    console.log("Nouveau message reçu :", msg);
                    newMessagesQueue.push(msg);
                });
            }
        }
    } catch (error) {
        console.error("Erreur récupération messages :", error);
        // En cas d'erreur, on ne fait rien, l'ancien tableau reste en mémoire
    }
}

// 2. Choisir et afficher le message
function showNextMessage() {
    if (!allMessages || allMessages.length === 0) {
        tickerElement.innerText = "ENVOIE TA DEDICACE !";
        // On s'assure que l'animation se lance même pour ce message
        tickerElement.classList.remove('animate-reveal');
        void tickerElement.offsetWidth;
        tickerElement.classList.add('animate-reveal');
        return;
    }

    let messageToShow = "";

    // LOGIQUE : Priorité aux nouveaux, sinon Aléatoire
    if (newMessagesQueue.length > 0) {
        messageToShow = newMessagesQueue.shift();
    } else {
        const randomIndex = Math.floor(Math.random() * allMessages.length);
        messageToShow = allMessages[randomIndex];
    }

    // --- LA MAGIE POUR RELANCER L'ANIMATION ---

    // 1. On retire la classe d'animation (reset)
    tickerElement.classList.remove('animate-reveal');

    // 2. TRÈS IMPORTANT : On force le navigateur à "reflow" (recalculer)
    // Sans cette ligne, le navigateur est trop rapide et ne voit pas le changement
    void tickerElement.offsetWidth;

    // 3. On change le texte
    tickerElement.innerText = messageToShow;

    // 4. On remet la classe pour lancer l'animation
    tickerElement.classList.add('animate-reveal');
}

// ================= FONCTIONS DU SITE (INTERACTION) =================

function lancerSite() {
    // On s'assure que la bonne vidéo est chargée
    updateVideoSource();

    // On lance la vidéo avec son
    video.muted = false;
    video.volume = lastVolume;
    const playPromise = video.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            updateSoundUI(false, video.volume);
        }).catch(err => {
            console.warn("Autoplay sonore bloqué par le navigateur, lecture en muet :", err);
            video.muted = true;
            video.play();
            updateSoundUI(true, 0);
        });
    }

    // On fait disparaître l'overlay
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);

    // On lance la récupération des messages dès qu'on entre sur le site
    fetchMessages();
    // On lance la vérification régulière (toutes les 3s)
    setInterval(fetchMessages, POLLING_TIME);
}

async function envoyerMessage() {
    // Sélection des éléments
    const input = document.getElementById('dedicaceInput');
    const emailInput = document.getElementById('emailInput');
    const statut = document.getElementById('statut');
    const btn = document.querySelector('button'); // Le bouton envoyer
    const logoSidebar = document.querySelector('.logo-sidebar'); // Le logo de la barre latérale

    // Si le message est vide, on arrête tout de suite
    if (!input.value) return;

    // --- ETAT DEBUT ENVOI ---
    btn.disabled = true;           // 1. On désactive le bouton (anti-spam)
    btn.innerText = "ENVOI...";    // 2. On change le texte
    logoSidebar.classList.add('rotating'); // 3. On fait tourner le logo

    try {
        await fetch(URL_SCRIPT, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: input.value,
                email: emailInput.value
            })
        });

        // --- SUCCES ---
        input.value = ""; // On vide le champ

        // On rafraichit les messages pour voir le sien (optionnel)
        setTimeout(fetchMessages, 1000);

        // On efface le message de succès après 3 secondes
        setTimeout(() => { statut.innerText = ""; }, 3000);

    } catch (error) {
        // --- ERREUR ---
        console.error(error);
    } finally {
        // --- ETAT FIN (Toujours exécuté, même si erreur) ---
        btn.disabled = false;            // 1. On réactive le bouton
        btn.innerText = "ENVOYER";       // 2. On remet le texte d'origine
        logoSidebar.classList.remove('rotating'); // 3. On arrête le logo
    }
}

// ================= ECOUTEURS D'EVENEMENTS =================

// Touche Entrée dans la zone de texte
textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        envoyerMessage();
    }
});

// Touche Entrée dans l'email
emailField.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        textarea.focus();
    }
});