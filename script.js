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
    // On retire le mute et on lance la vidéo
    video.muted = false;
    video.play();

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