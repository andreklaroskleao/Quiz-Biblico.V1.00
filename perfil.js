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
const statWrong = document.getElementById('stat-wrong');
const achievementsGrid = document.getElementById('achievements-grid');

// Modal de Edição
const editBioModal = document.getElementById('edit-bio-modal');
const bioTextarea = document.getElementById('bio-textarea');
const saveBioBtn = document.getElementById('save-bio-btn');
const cancelBioBtn = document.getElementById('cancel-bio-btn');

let currentUser = null;
let profileUid = null;

// Definição das conquistas (para exibir nome e descrição)
const achievementsMap = {
    'iniciante_da_fe': { title: 'Iniciante da Fé', description: 'Completou o primeiro quiz.', icon: '📖' },
    'erudito_aprendiz': { title: 'Erudito Aprendiz', description: 'Alcançou 1000 pontos.', icon: '📜' },
    'peregrino_fiel': { title: 'Peregrino Fiel', description: 'Jogou 10 quizzes.', icon: '👣' }
};

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', async () => {
    loadingDiv.classList.remove('hidden');

    // Pega o UID da URL
    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');

    if (!profileUid) {
        showNotFound();
        return;
    }

    // Verifica o usuário atualmente logado
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        // Se o usuário logado for o dono do perfil, mostra o botão de editar
        if (currentUser && currentUser.uid === profileUid) {
            editBioBtn.classList.remove('hidden');
        }
    });

    // Carrega os dados do perfil
    await loadProfileData();
});

async function loadProfileData() {
    try {
        const userRef = doc(db, 'usuarios', profileUid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            displayProfileData(userData);
            loadingDiv.classList.add('hidden');
            contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        showNotFound();
    }
}

function displayProfileData(data) {
    profilePhoto.src = data.fotoURL || 'https://placehold.co/150x150/e0e0e0/333?text=?';
    profileName.textContent = data.nome || 'Jogador Anônimo';
    profileBio.textContent = data.bio || '';

    // Preenche as estatísticas
    const stats = data.stats || {};
    statScore.textContent = stats.pontuacaoTotal || 0;
    statQuizzes.textContent = stats.quizzesJogados || 0;
    statCorrect.textContent = stats.respostasCertas || 0;
    statWrong.textContent = stats.respostasErradas || 0;

    // Preenche as conquistas
    achievementsGrid.innerHTML = '';
    const userAchievements = data.conquistas || [];
    if (userAchievements.length === 0) {
        achievementsGrid.innerHTML = '<p>Nenhuma conquista desbloqueada ainda. Continue jogando!</p>';
    } else {
        userAchievements.forEach(achievKey => {
            const achievement = achievementsMap[achievKey];
            if (achievement) {
                const achievElement = document.createElement('div');
                achievElement.classList.add('achievement-badge');
                achievElement.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <h4>${achievement.title}</h4>
                        <p>${achievement.description}</p>
                    </div>
                `;
                achievementsGrid.appendChild(achievElement);
            }
        });
    }
}

function showNotFound() {
    loadingDiv.classList.add('hidden');
    contentDiv.classList.add('hidden');
    notFoundDiv.classList.remove('hidden');
}

// --- Lógica do Modal de Edição de Bio ---
editBioBtn.addEventListener('click', () => {
    bioTextarea.value = profileBio.textContent;
    editBioModal.classList.remove('hidden');
});

cancelBioBtn.addEventListener('click', () => {
    editBioModal.classList.add('hidden');
});

saveBioBtn.addEventListener('click', async () => {
    const newBio = bioTextarea.value;
    saveBioBtn.disabled = true;
    saveBioBtn.textContent = 'Salvando...';

    try {
        const userRef = doc(db, 'usuarios', profileUid);
        await updateDoc(userRef, {
            bio: newBio
        });
        profileBio.textContent = newBio;
        editBioModal.classList.add('hidden');
    } catch (error) {
        console.error("Erro ao salvar a bio:", error);
        alert("Não foi possível salvar a bio. Tente novamente.");
    } finally {
        saveBioBtn.disabled = false;
        saveBioBtn.textContent = 'Salvar';
    }
});
