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
const shareProfileBtn = document.getElementById('share-profile-btn');
const statScore = document.getElementById('stat-score');
const statQuizzes = document.getElementById('stat-quizzes');
const statCorrect = document.getElementById('stat-correct');
const statAccuracy = document.getElementById('stat-accuracy');
const achievementsGrid = document.getElementById('achievements-grid');
const editBioModal = document.getElementById('edit-bio-modal');
const bioTextarea = document.getElementById('bio-textarea');
const saveBioBtn = document.getElementById('save-bio-btn');
const cancelBioBtn = document.getElementById('cancel-bio-btn');
const showInRankingCheckbox = document.getElementById('show-in-ranking-checkbox');
const settingsSection = document.getElementById('profile-settings');

let currentUser = null;
let profileUid = null;

// Definição de todas as conquistas
const allAchievements = {
    'iniciante_da_fe': { title: 'Iniciante da Fé', description: 'Completou o primeiro quiz.', icon: '📖' },
    'peregrino_fiel': { title: 'Peregrino Fiel', description: 'Jogou 10 quizzes.', icon: '👣' },
    'discipulo_dedicado': { title: 'Discípulo Dedicado', description: 'Jogou 50 quizzes.', icon: '🚶‍♂️' },
    'veterano_da_palavra': { title: 'Veterano da Palavra', description: 'Jogou 100 quizzes.', icon: '🏃‍♂️' },
    'erudito_aprendiz': { title: 'Erudito Aprendiz', description: 'Alcançou 1.000 pontos.', icon: '📜' },
    'sabio_de_israel': { title: 'Sábio de Israel', description: 'Alcançou 5.000 pontos.', icon: '👑' },
    'conselheiro_real': { title: 'Conselheiro Real', description: 'Alcançou 10.000 pontos.', icon: '🏛️' },
    'mestre_da_palavra': { title: 'Mestre da Palavra', description: 'Acertou 100 perguntas.', icon: '✒️' },
    'escriba_habil': { title: 'Escriba Hábil', description: 'Acertou 500 perguntas.', icon: '✍️' },
    'doutor_da_lei': { title: 'Doutor da Lei', description: 'Acertou 1.000 perguntas.', icon: '🎓' },
    'explorador_do_pentateuco': { title: 'Explorador do Pentateuco', description: 'Acertou 20 perguntas sobre o Pentateuco.', icon: '📜' },
    'historiador_dos_reis': { title: 'Historiador dos Reis', description: 'Acertou 20 perguntas sobre História.', icon: '🏰' },
    'amigo_dos_profetas': { title: 'Amigo dos Profetas', description: 'Acertou 20 perguntas sobre Profetas.', icon: '🗣️' },
    'seguidor_do_messias': { title: 'Seguidor do Messias', description: 'Acertou 50 perguntas sobre os Evangelhos.', icon: '✝️' },
    'pioneiro_da_igreja': { title: 'Pioneiro da Igreja', description: 'Acertou 20 perguntas sobre a Igreja Primitiva.', icon: '⛪' },
    'leitor_de_cartas': { title: 'Leitor de Cartas', description: 'Acertou 30 perguntas sobre as Epístolas.', icon: '✉️' },
    'visionario_do_apocalipse': { title: 'Visionário do Apocalipse', description: 'Acertou 10 perguntas sobre Profecias.', icon: '👁️' },
    'conhecedor_de_patriarcas': { title: 'Conhecedor de Patriarcas', description: 'Acertou 15 perguntas sobre os Patriarcas.', icon: '👴' },
    'especialista_em_milagres': { title: 'Especialista em Milagres', description: 'Acertou 10 perguntas sobre Milagres.', icon: '✨' },
    'curioso_biblico': { title: 'Curioso Bíblico', description: 'Acertou 10 perguntas de Curiosidades.', icon: '🤔' },
    'teologo_iniciante': { title: 'Teólogo Iniciante', description: 'Acertou 10 perguntas de Teologia.', icon: '🧠' },
    'bom_comeco': { title: 'Bom Começo', description: 'Acertou 10 perguntas seguidas.', icon: '👍' },
    'impecavel': { title: 'Impecável', description: 'Completou um quiz sem errar nenhuma pergunta.', icon: '🎯' },
    'quase_la': { title: 'Quase Lá', description: 'Fez 90 pontos em um quiz.', icon: '🥈' },
    'perfeccionista': { title: 'Perfeccionista', description: 'Fez 100 pontos em um quiz.', icon: '🏆' },
    'fundador_de_grupo': { title: 'Fundador', description: 'Criou seu primeiro grupo.', icon: '🏗️' },
    'socializador': { title: 'Socializador', description: 'Entrou em um grupo.', icon: '🤝' },
    'competidor': { title: 'Competidor', description: 'Jogou uma partida por um grupo.', icon: '⚔️' },
    'campeao_de_grupo': { title: 'Campeão de Grupo', description: 'Alcançou 1.000 pontos em um grupo.', icon: '🥇' },
    'lenda_do_grupo': { title: 'Lenda do Grupo', description: 'Alcançou 5.000 pontos em um grupo.', icon: '🌟' }
};

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');

    if (!profileUid) {
        showNotFound();
        return;
    }

    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.add('hidden');

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
            if (contentDiv) contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        showNotFound();
    } finally {
        if (loadingDiv) loadingDiv.classList.add('hidden');
    }
}

function displayProfileData(data) {
    if (profilePhoto) profilePhoto.src = data.fotoURL || 'https://placehold.co/150x150/e0e0e0/333?text=?';
    if (profileName) profileName.textContent = data.nome || 'Jogador Anônimo';
    if (profileBio) profileBio.textContent = data.bio || '';

    const isOwnProfile = currentUser && currentUser.uid === profileUid;
    if (editBioBtn) editBioBtn.classList.toggle('hidden', !isOwnProfile);
    if (settingsSection) settingsSection.classList.toggle('hidden', !isOwnProfile);

    if (isOwnProfile && showInRankingCheckbox) {
        showInRankingCheckbox.checked = data.showInRanking !== false;
    }

    const stats = data.stats || {};
    const totalCertas = stats.respostasCertas || 0;
    const totalErradas = stats.respostasErradas || 0;
    const totalRespostas = totalCertas + totalErradas;
    const accuracy = totalRespostas > 0 ? ((totalCertas / totalRespostas) * 100).toFixed(0) : 0;

    if (statScore) statScore.textContent = stats.pontuacaoTotal || 0;
    if (statQuizzes) statQuizzes.textContent = stats.quizzesJogados || 0;
    if (statCorrect) statCorrect.textContent = totalCertas;
    if (statAccuracy) statAccuracy.textContent = `${accuracy}%`;

    if (achievementsGrid) {
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
}

function showNotFound() {
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.remove('hidden');
}

// --- Lógica do Modal e Ações ---
if (editBioBtn) editBioBtn.addEventListener('click', () => {
    if (bioTextarea) bioTextarea.value = profileBio.textContent;
    if (editBioModal) editBioModal.classList.add('visible');
});

if (cancelBioBtn) cancelBioBtn.addEventListener('click', () => {
    if (editBioModal) editBioModal.classList.remove('visible');
});

if (saveBioBtn) saveBioBtn.addEventListener('click', async () => {
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
        if (profileBio) profileBio.textContent = newBio;
        if (editBioModal) editBioModal.classList.remove('visible');
    } catch (error) {
        console.error("Erro ao salvar a bio:", error);
        alert("Não foi possível salvar a bio. Tente novamente.");
    } finally {
        saveBioBtn.disabled = false;
        saveBioBtn.textContent = 'Salvar';
    }
});

if (shareProfileBtn) shareProfileBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link do perfil copiado para a área de transferência!'))
        .catch(() => alert('Não foi possível copiar o link.'));
});

if (showInRankingCheckbox) showInRankingCheckbox.addEventListener('change', async (e) => {
    if (!currentUser) return;
    try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        await updateDoc(userRef, {
            showInRanking: e.target.checked
        });
    } catch (error) {
        console.error("Erro ao atualizar preferência de ranking:", error);
        alert("Não foi possível salvar sua preferência.");
    }
});
