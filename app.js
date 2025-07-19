import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const userPhotoImg = document.getElementById('user-photo');
const adminLink = document.getElementById('admin-link');
const profileLink = document.getElementById('profile-link');
const welcomeMessage = document.getElementById('welcome-message');
const mainMenu = document.getElementById('main-menu');
const difficultySelection = document.getElementById('difficulty-selection');
const initialScreen = document.getElementById('initial-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const progressBar = document.getElementById('quiz-progress-bar');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedback = document.getElementById('feedback');
const reference = document.getElementById('reference');
const nextBtn = document.getElementById('next-btn');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const groupsContainer = document.getElementById('groups-container');
const groupsList = document.getElementById('groups-list');
const createGroupBtn = document.getElementById('create-group-btn');
const createGroupModal = document.getElementById('create-group-modal');
const groupNameInput = document.getElementById('group-name-input');
const saveGroupBtn = document.getElementById('save-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');
const groupPlayNotification = document.getElementById('group-play-notification');
const groupPlayName = document.getElementById('group-play-name');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const rankingCard = document.getElementById('ranking-card');
const rankingModal = document.getElementById('ranking-modal');
const rankingTbody = document.getElementById('ranking-tbody');
const closeRankingBtn = document.getElementById('close-ranking-btn');

// --- Estado do Quiz ---
let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let currentGroupId = null;

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromUrl = urlParams.get('groupId');
    if (groupIdFromUrl) {
        sessionStorage.setItem('currentGroupId', groupIdFromUrl);
    }
    if (window.history.replaceState) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }
});

// --- Funções ---
function switchScreen(newScreenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        if (screen && !screen.classList.contains('hidden')) {
            screen.classList.add('hidden');
        }
    });
    const screenToShow = document.getElementById(newScreenId);
    if (screenToShow) {
        screenToShow.classList.remove('hidden');
    }
}

async function updateUiforGroupMode() {
    const groupId = sessionStorage.getItem('currentGroupId');
    if (groupPlayNotification && groupPlayName) {
        if (groupId) {
            try {
                const groupRef = doc(db, 'grupos', groupId);
                const groupDoc = await getDoc(groupRef);
                if (groupDoc.exists()) {
                    groupPlayName.textContent = groupDoc.data().nomeDoGrupo;
                    groupPlayNotification.classList.remove('hidden');
                }
            } catch (error) {
                console.error("Erro ao buscar nome do grupo:", error);
                groupPlayNotification.classList.add('hidden');
            }
        } else {
            groupPlayNotification.classList.add('hidden');
        }
    }
}

const provider = new GoogleAuthProvider();
if (loginBtn) loginBtn.addEventListener('click', () => signInWithPopup(auth, provider).catch(console.error));
if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(auth).catch(console.error); });

onAuthStateChanged(auth, async (user) => {
    await updateUiforGroupMode();

    if (user) {
        currentUser = user;
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userInfoDiv) userInfoDiv.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');
        if (welcomeMessage) welcomeMessage.classList.add('hidden');
        if (userNameSpan) userNameSpan.textContent = user.displayName || "Jogador";
        if (userPhotoImg) userPhotoImg.src = user.photoURL || "https://placehold.co/45x45/e0e0e0/333?text=?";
        if (profileLink) {
            profileLink.href = `perfil.html?uid=${user.uid}`;
            profileLink.classList.remove('hidden');
        }
        await saveUserToFirestore(user);
        await checkAdminStatus(user.uid);
        await loadUserGroups(user.uid);
    } else {
        currentUser = null;
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userInfoDiv) userInfoDiv.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (mainMenu) mainMenu.classList.add('hidden');
        if (welcomeMessage) welcomeMessage.classList.remove('hidden');
        if (adminLink) adminLink.classList.add('hidden');
        if (profileLink) profileLink.classList.add('hidden');
    }
});

async function saveUserToFirestore(user) {
    const userRef = doc(db, 'usuarios', user.uid);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                nome: user.displayName || "Jogador Anônimo",
                email: user.email,
                fotoURL: user.photoURL || "https://placehold.co/150x150/e0e0e0/333?text=?",
                admin: false,
                bio: "Novo no Quiz Bíblico!",
                showInRanking: true,
                stats: { pontuacaoTotal: 0, quizzesJogados: 0, respostasCertas: 0, respostasErradas: 0 },
                conquistas: []
            });
        } else {
            const updateData = {};
            if (user.displayName) updateData.nome = user.displayName;
            if (user.photoURL) updateData.fotoURL = user.photoURL;
            if (Object.keys(updateData).length > 0) {
                await setDoc(userRef, updateData, { merge: true });
            }
        }
    } catch (error) {
        console.error("Erro ao salvar usuário no Firestore:", error);
    }
}
async function checkAdminStatus(uid) {
    if (!adminLink) return;
    const userRef = doc(db, 'usuarios', uid);
    const userDoc = await getDoc(userRef);
    adminLink.classList.toggle('hidden', !(userDoc.exists() && userDoc.data().admin === true));
}

// --- Lógica de Grupos ---
async function loadUserGroups(uid) {
    if (!groupsList) return;
    groupsList.innerHTML = '<p>A carregar...</p>';
    const q = query(collection(db, "grupos"), where("memberUIDs", "array-contains", uid));
    try {
        const querySnapshot = await getDocs(q);
        groupsList.innerHTML = '';
        if (querySnapshot.empty) {
            groupsList.innerHTML = '<p>Ainda não participa de nenhum grupo.</p>';
        }
        querySnapshot.forEach((doc) => {
            const group = doc.data();
            const groupElement = document.createElement('a');
            groupElement.href = `grupo.html?id=${doc.id}`;
            groupElement.className = 'group-item';
            groupElement.innerHTML = `
                <span><i class="${group.groupIcon || 'fas fa-users'}"></i> ${group.nomeDoGrupo}</span>
                <span class="member-count">${group.memberUIDs.length} membros</span>
            `;
            groupsList.appendChild(groupElement);
        });
    } catch (error) {
        console.error("Erro ao carregar grupos:", error);
        groupsList.innerHTML = '<p>Não foi possível carregar os grupos.</p>';
    }
}
if (createGroupBtn) createGroupBtn.addEventListener('click', () => createGroupModal.classList.add('visible'));
if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => createGroupModal.classList.remove('visible'));
if (saveGroupBtn) saveGroupBtn.addEventListener('click', async () => {
    const groupName = groupNameInput.value.trim();
    if (groupName.length < 3) {
        alert("O nome do grupo deve ter pelo menos 3 caracteres.");
        return;
    }
    if (!currentUser) {
        alert("Precisa de estar logado para criar um grupo.");
        return;
    }

    saveGroupBtn.disabled = true;
    saveGroupBtn.textContent = 'A criar...';

    try {
        const newGroup = {
            nomeDoGrupo: groupName,
            criadorUid: currentUser.uid,
            criadorNome: currentUser.displayName,
            dataCriacao: serverTimestamp(),
            groupIcon: 'fas fa-book-bible',
            memberUIDs: [currentUser.uid],
            membros: {
                [currentUser.uid]: {
                    nome: currentUser.displayName,
                    fotoURL: currentUser.photoURL,
                    pontuacaoNoGrupo: 0
                }
            }
        };
        await addDoc(collection(db, "grupos"), newGroup);
        alert(`Grupo "${groupName}" criado com sucesso!`);
        groupNameInput.value = '';
        createGroupModal.classList.remove('visible');
        await loadUserGroups(currentUser.uid);
    } catch (error) {
        console.error("Erro ao criar grupo:", error);
        alert("Não foi possível criar o grupo.");
    } finally {
        saveGroupBtn.disabled = false;
        saveGroupBtn.textContent = 'Criar';
    }
});

if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentGroupId');
    updateUiforGroupMode();
});

// --- Lógica do Ranking Geral ---
if (rankingCard) rankingCard.addEventListener('click', async () => {
    if (rankingModal) rankingModal.classList.add('visible');
    await loadGeneralRanking();
});
if (closeRankingBtn) closeRankingBtn.addEventListener('click', () => {
    if (rankingModal) rankingModal.classList.remove('visible');
});

async function loadGeneralRanking() {
    if (!rankingTbody) return;
    rankingTbody.innerHTML = '<tr><td colspan="3">A carregar ranking...</td></tr>';
    try {
        const q = query(
            collection(db, "usuarios"), 
            where("showInRanking", "==", true),
            orderBy("stats.pontuacaoTotal", "desc"), 
            limit(100)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            rankingTbody.innerHTML = '<tr><td colspan="3">Nenhum jogador no ranking ainda.</td></tr>';
            return;
        }

        rankingTbody.innerHTML = '';
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const row = document.createElement('tr');
            const rankClass = `rank-${rank}`;
            
            row.innerHTML = `
                <td class="rank ${rankClass}">${rank}</td>
                <td class="member-info">
                    <a href="perfil.html?uid=${user.uid}" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 15px;">
                        <img src="${user.fotoURL || 'https://placehold.co/40x40'}" alt="Foto de ${user.nome}">
                        <span>${user.nome}</span>
                    </a>
                </td>
                <td class="score">${user.stats.pontuacaoTotal || 0}</td>
            `;
            rankingTbody.appendChild(row);
            rank++;
        });

    } catch (error) {
        console.error("Erro ao carregar o ranking geral:", error);
        rankingTbody.innerHTML = '<tr><td colspan="3">Não foi possível carregar o ranking.</td></tr>';
    }
}

// --- Lógica do Quiz ---
if (difficultySelection) difficultySelection.addEventListener('click', (e) => {
    if (e.target.matches('.btn[data-difficulty]')) {
        startQuiz(e.target.dataset.difficulty);
    }
});

async function startQuiz(difficulty) {
    currentGroupId = sessionStorage.getItem('currentGroupId');
    score = 0;
    correctAnswersCount = 0;
    currentQuestionIndex = 0;
    if (nextBtn) nextBtn.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';

    try {
        const q = query(collection(db, "perguntas"), where("nivel", "==", difficulty));
        const querySnapshot = await getDocs(q);
        const allQuestions = [];
        querySnapshot.forEach(doc => allQuestions.push({ id: doc.id, ...doc.data() }));
        questions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);

        if (questions.length > 0) {
            switchScreen('quiz-screen');
            displayQuestion();
        } else {
            alert("Não foram encontradas perguntas para esta dificuldade.");
        }
    } catch (error) {
        console.error("Erro ao buscar perguntas: ", error);
        alert("Ocorreu um erro ao carregar as perguntas.");
    }
}

function displayQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }
    const progress = (currentQuestionIndex / questions.length) * 100;
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (questionText) questionText.textContent = questions[currentQuestionIndex].enunciado;
    if (optionsContainer) optionsContainer.innerHTML = '';
    if (feedback) feedback.innerHTML = '';
    if (reference) reference.innerHTML = '';
    if (nextBtn) nextBtn.classList.add('hidden');

    questions[currentQuestionIndex].alternativas.forEach((alt, index) => {
        const button = document.createElement('button');
        button.textContent = alt;
        button.classList.add('btn', 'option-btn');
        button.dataset.index = index;
        button.addEventListener('click', handleAnswer);
        if (optionsContainer) optionsContainer.appendChild(button);
    });
}
function handleAnswer(e) {
    Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);
    const selectedButton = e.target;
    const selectedIndex = parseInt(selectedButton.dataset.index);
    const question = questions[currentQuestionIndex];
    const isCorrect = selectedIndex === question.correta;

    if (isCorrect) {
        selectedButton.classList.add('correct');
        if (feedback) feedback.textContent = 'Resposta Correta!';
        score += 10;
        correctAnswersCount++;
    } else {
        selectedButton.classList.add('wrong');
        if (feedback) feedback.textContent = 'Resposta Errada!';
        optionsContainer.children[question.correta].classList.add('correct');
    }
    
    if (reference) reference.textContent = `Referência: ${question.referencia}`;
    if (nextBtn) nextBtn.classList.remove('hidden');
    if (progressBar) progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
}
if (nextBtn) nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    displayQuestion();
});

async function showResults() {
    switchScreen('result-screen');
    if (finalScore) finalScore.textContent = score;
    const motivationalMessage = document.getElementById('motivational-message');
    if (motivationalMessage) motivationalMessage.textContent = '"Combati o bom combate, acabei a carreira, guardei a fé." - 2 Timóteo 4:7';

    if (!currentUser) return;
    try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        const wrongAnswersCount = questions.length - correctAnswersCount;
        
        await updateDoc(userRef, {
            "stats.pontuacaoTotal": increment(score),
            "stats.quizzesJogados": increment(1),
            "stats.respostasCertas": increment(correctAnswersCount),
            "stats.respostasErradas": increment(wrongAnswersCount)
        });

        if (currentGroupId) {
            const groupRef = doc(db, 'grupos', currentGroupId);
            await updateDoc(groupRef, {
                [`membros.${currentUser.uid}.pontuacaoNoGrupo`]: increment(score)
            });
        }

        await checkAndAwardAchievements(userRef);
    } catch (error) {
        console.error("Erro ao atualizar estatísticas:", error);
    }
}

async function checkAndAwardAchievements(userRef) {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const userAchievements = new Set(userData.conquistas || []);
    let newAchievements = [];

    const stats = userData.stats;
    if (!userAchievements.has("iniciante_da_fe") && stats.quizzesJogados >= 1) newAchievements.push("iniciante_da_fe");
    if (!userAchievements.has("erudito_aprendiz") && stats.pontuacaoTotal >= 1000) newAchievements.push("erudito_aprendiz");
    if (!userAchievements.has("peregrino_fiel") && stats.quizzesJogados >= 10) newAchievements.push("peregrino_fiel");
    if (!userAchievements.has("sabio_de_israel") && stats.pontuacaoTotal >= 5000) newAchievements.push("sabio_de_israel");
    if (!userAchievements.has("mestre_da_palavra") && stats.respostasCertas >= 100) newAchievements.push("mestre_da_palavra");

    if (newAchievements.length > 0) {
        await updateDoc(userRef, { conquistas: arrayUnion(...newAchievements) });
        setTimeout(() => {
            alert(`Parabéns! Desbloqueou ${newAchievements.length} nova(s) conquista(s)!`);
        }, 500);
    }
}
if (restartBtn) restartBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentGroupId');
    updateUiforGroupMode();
    switchScreen('initial-screen');
});
