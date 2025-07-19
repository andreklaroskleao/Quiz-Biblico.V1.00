import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loadingDiv = document.getElementById('loading-profile');
const contentDiv = document.getElementById('profile-content');
const notFoundDiv = document.getElementById('profile-not-found');

const profilePhoto = document.getElementById('profile-photo');
const profileName = document.getElementById('profile-name');
const profileBio = document.getElementById('profile-bio');
const editBioBtn = document.getElementById('edit-bio-btn');

const statScore = document.getElementById('stat-score');
const statQuizzes = document.getElementById('stat-quizzes');
const statCorrect = document.getElementById('stat-correct');
const statAccuracy = document.getElementById('stat-accuracy');
const achievementsGrid = document.getElementById('achievements-grid');

const editBioModal = document.getElementById('edit-bio-modal');
const bioTextarea = document.getElementById('bio-textarea');
const saveBioBtn = document.getElementById('save-bio-btn');
const cancelBioBtn = document.getElementById('cancel-bio-btn');

let currentUser = null;
let profileUid = null;

// Definição de todas as conquistas
const allAchievements = {
    'iniciante_da_fe': { title: 'Iniciante da Fé', description: 'Completou o primeiro quiz.', icon: '📖' },
    'erudito_aprendiz': { title: 'Erudito Aprendiz', description: 'Alcançou 1.000 pontos.', icon: '📜' },
    'peregrino_fiel': { title: 'Peregrino Fiel', description: 'Jogou 10 quizzes.', icon: '👣' },
    'sabio_de_israel': { title: 'Sábio de Israel', description: 'Alcançou 5.000 pontos.', icon: '👑' },
    'mestre_da_palavra': { title: 'Mestre da Palavra', description: 'Acertou 100 perguntas.', icon: '✒️' }
};

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');

    if (!profileUid) {
        showNotFound();
        return;
    }

    loadingDiv.classList.remove('hidden');
    contentDiv.classList.add('hidden');
    notFoundDiv.classList.add('hidden');

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadProfileData();
    });
});

async function loadProfileData() {
    try {
        const userRef = doc(db, 'usuarios', profileUid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            displayProfileData(userDoc.data());
            contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        showNotFound();
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

function displayProfileData(data) {
    profilePhoto.src = data.fotoURL || 'https://placehold.co/150x150/e0e0e0/333?text=?';
    profileName.textContent = data.nome || 'Jogador Anônimo';
    profileBio.textContent = data.bio || '';

    editBioBtn.classList.toggle('hidden', !(currentUser && currentUser.uid === profileUid));

    const stats = data.stats || {};
    const totalCertas = stats.respostasCertas || 0;
    const totalErradas = stats.respostasErradas || 0;
    const totalRespostas = totalCertas + totalErradas;
    const accuracy = totalRespostas > 0 ? ((totalCertas / totalRespostas) * 100).toFixed(0) : 0;

    statScore.textContent = stats.pontuacaoTotal || 0;
    statQuizzes.textContent = stats.quizzesJogados || 0;
    statCorrect.textContent = totalCertas;
    statAccuracy.textContent = `${accuracy}%`;

    achievementsGrid.innerHTML = '';
    const userAchievements = new Set(data.conquistas || []);

    Object.keys(allAchievements).forEach(key => {
        const achievement = allAchievements[key];
        const isUnlocked = userAchievements.has(key);
        const achievElement = document.createElement('div');
        achievElement.className = 'achievement-badge' + (isUnlocked ? '' : ' locked');
        achievElement.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <h4>${achievement.title}</h4>
                <p>${achievement.description}</p>
            </div>
        `;
        achievementsGrid.appendChild(achievElement);
    });
}

function showNotFound() {
    loadingDiv.classList.add('hidden');
    contentDiv.classList.add('hidden');
    notFoundDiv.classList.remove('hidden');
}

// --- Lógica do Modal ---
editBioBtn.addEventListener('click', () => {
    bioTextarea.value = profileBio.textContent;
    editBioModal.classList.add('visible');
});

cancelBioBtn.addEventListener('click', () => {
    editBioModal.classList.remove('visible');
});

saveBioBtn.addEventListener('click', async () => {
    const newBio = bioTextarea.value.trim();
    if (newBio.length > 150) {
        alert("A biografia não pode ter mais de 150 caracteres.");
        return;
    }
    saveBioBtn.disabled = true;
    saveBioBtn.textContent = 'Salvando...';

    try {
        const userRef = doc(db, 'usuarios', profileUid);
        await updateDoc(userRef, { bio: newBio });
        profileBio.textContent = newBio;
        editBioModal.classList.remove('visible');
    } catch (error) {
        console.error("Erro ao salvar a bio:", error);
        alert("Não foi possível salvar a bio. Tente novamente.");
    } finally {
        saveBioBtn.disabled = false;
        saveBioBtn.textContent = 'Salvar';
    }
});
