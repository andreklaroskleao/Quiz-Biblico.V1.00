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

// NOVOS Elementos
const shareProfileBtn = document.getElementById('share-profile-btn');
const profileSettingsDiv = document.getElementById('profile-settings');
const rankingCheckbox = document.getElementById('ranking-checkbox');

let currentUser = null;
let profileUid = null;
let userProfileData = {}; // Guarda os dados do perfil para uso no compartilhamento

// Definição das conquistas (para exibir nome e descrição)
const achievementsMap = {
    'iniciante_da_fe': { title: 'Iniciante da Fé', description: 'Completou o primeiro quiz.', icon: '📖' },
    'erudito_aprendiz': { title: 'Erudito Aprendiz', description: 'Alcançou 1000 pontos.', icon: '📜' },
    'peregrino_fiel': { title: 'Peregrino Fiel', description: 'Jogou 10 quizzes.', icon: '👣' }
};

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', async () => {
    loadingDiv.classList.remove('hidden');

    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');

    if (!profileUid) {
        showNotFound();
        return;
    }

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (currentUser && currentUser.uid === profileUid) {
            editBioBtn.classList.remove('hidden');
            // Mostra as configurações de privacidade para o dono do perfil
            profileSettingsDiv.classList.remove('hidden');
        }
    });

    await loadProfileData();
});

async function loadProfileData() {
    try {
        const userRef = doc(db, 'usuarios', profileUid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            userProfileData = userDoc.data(); // Salva os dados para usar depois
            displayProfileData(userProfileData);
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

    const stats = data.stats || {};
    statScore.textContent = stats.pontuacaoTotal || 0;
    statQuizzes.textContent = stats.quizzesJogados || 0;
    statCorrect.textContent = stats.respostasCertas || 0;
    statWrong.textContent = stats.respostasErradas || 0;

    // Define o estado do checkbox de ranking
    rankingCheckbox.checked = data.aceitaRanking === true;

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
        await updateDoc(userRef, { bio: newBio });
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

// --- NOVA LÓGICA ---

// Event listener para o checkbox de ranking
rankingCheckbox.addEventListener('change', async () => {
    if (!currentUser || currentUser.uid !== profileUid) return;

    const isChecked = rankingCheckbox.checked;
    rankingCheckbox.disabled = true;

    try {
        const userRef = doc(db, 'usuarios', profileUid);
        await updateDoc(userRef, {
            aceitaRanking: isChecked
        });
        alert('Preferência de ranking atualizada com sucesso!');
    } catch (error) {
        console.error("Erro ao atualizar preferência de ranking:", error);
        alert('Não foi possível salvar sua preferência. Tente novamente.');
        rankingCheckbox.checked = !isChecked; // Reverte em caso de erro
    } finally {
        rankingCheckbox.disabled = false;
    }
});

// Event listener para o botão de compartilhar
shareProfileBtn.addEventListener('click', async () => {
    if (!userProfileData.nome) {
        alert("Os dados do perfil ainda não foram carregados.");
        return;
    }

    const stats = userProfileData.stats || {};
    const achievementsList = (userProfileData.conquistas || [])
        .map(key => achievementsMap[key]?.title || '')
        .filter(Boolean)
        .join(', ');

    const shareText = `Confira meu perfil no Quiz Bíblico!

👤 Nome: ${userProfileData.nome}

📊 Estatísticas:
- Pontuação Total: ${stats.pontuacaoTotal || 0}
- Quizzes Jogados: ${stats.quizzesJogados || 0}
- Respostas Certas: ${stats.respostasCertas || 0}

🏆 Conquistas: ${achievementsList || 'Nenhuma ainda'}

Jogue você também!`;

    const shareData = {
        title: `Perfil de ${userProfileData.nome} no Quiz Bíblico`,
        text: shareText,
        url: window.location.href
    };

    try {
        // Usa a API de compartilhamento nativa se disponível
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: copia para a área de transferência
            await navigator.clipboard.writeText(`${shareText}\n\nLink do Perfil: ${window.location.href}`);
            alert('Perfil copiado para a área de transferência!');
        }
    } catch (err) {
        // Ignora o erro se o usuário simplesmente fechar a janela de compartilhamento
        if (err.name !== 'AbortError') {
            console.error('Erro ao compartilhar:', err);
            alert('Ocorreu um erro ao tentar compartilhar.');
        }
    }
});
