import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userPhotoBorder = document.getElementById('user-photo-border');
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
const groupDifficultySelect = document.getElementById('group-difficulty-select');
const saveGroupBtn = document.getElementById('save-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');
const groupPlayNotification = document.getElementById('group-play-notification');
const groupPlayName = document.getElementById('group-play-name');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const rankingCard = document.getElementById('ranking-card');
const rankingModal = document.getElementById('ranking-modal');
const rankingTbody = document.getElementById('ranking-tbody');
const closeRankingBtn = document.getElementById('close-ranking-btn');
const leaveQuizBtn = document.getElementById('leave-quiz-btn');
const dobModal = document.getElementById('dob-modal');
const dobInput = document.getElementById('dob-input');
const saveDobBtn = document.getElementById('save-dob-btn');
const bibleCard = document.getElementById('bible-card');
const bibleModal = document.getElementById('bible-modal');
const closeBibleBtn = document.getElementById('close-bible-btn');
const bibleBookSelect = document.getElementById('bible-book-select');
const bibleChapterSelect = document.getElementById('bible-chapter-select');
const loadChapterBtn = document.getElementById('load-chapter-btn');
const bibleTextDisplay = document.getElementById('bible-text-display');
const competitionCard = document.getElementById('competition-card');
const competitionLobbyModal = document.getElementById('competition-lobby-modal');
const closeLobbyBtn = document.getElementById('close-lobby-btn');
const showCreateCompetitionBtn = document.getElementById('show-create-competition-btn');
const joinCodeInput = document.getElementById('join-code-input');
const joinCompetitionBtn = document.getElementById('join-competition-btn');
const createCompetitionModal = document.getElementById('create-competition-modal');
const competitionDifficultySelect = document.getElementById('competition-difficulty-select');
const competitionQuestionsSelect = document.getElementById('competition-questions-select');
const competitionMinPlayersInput = document.getElementById('competition-min-players-input');
const createCompetitionBtn = document.getElementById('create-competition-btn');
const cancelCreateCompetitionBtn = document.getElementById('cancel-create-competition-btn');
const waitingRoomModal = document.getElementById('waiting-room-modal');
const inviteCodeDisplay = document.getElementById('invite-code-display');
const startCompetitionBtn = document.getElementById('start-competition-btn');
const leaveWaitingRoomBtn = document.getElementById('leave-waiting-room-btn');
const teamAzulBox = document.getElementById('team-azul');
const teamAmareloBox = document.getElementById('team-amarelo');
const teamAzulList = document.getElementById('team-azul-list');
const teamAmareloList = document.getElementById('team-amarelo-list');
const chatMessagesDiv = document.getElementById('chat-messages');
const chatFormWaitingRoom = document.getElementById('chat-form-waiting-room');
const chatInputWaitingRoom = document.getElementById('chat-input-waiting-room');
const startRequirementMessage = document.getElementById('start-requirement-message');

// --- Estado do Quiz e Usuário ---
let currentUser = null;
let currentUserAgeGroup = "adulto";
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let currentGroupId = null;
let quizAtualDifficulty = 'facil';
let activeCompetitionId = null;
let unsubscribeCompetition = null;
let unsubscribeChat = null;

// --- Dados da Bíblia ---
const bibleBooks = {
    "Gênesis": 50, "Êxodo": 40, "Levítico": 27, "Números": 36, "Deuteronômio": 34, "Josué": 24, "Juízes": 21, "Rute": 4, "1 Samuel": 31, "2 Samuel": 24, "1 Reis": 22, "2 Reis": 25, "1 Crônicas": 29, "2 Crônicas": 36, "Esdras": 10, "Neemias": 13, "Ester": 10, "Jó": 42, "Salmos": 150, "Provérbios": 31, "Eclesiastes": 12, "Cantares": 8, "Isaías": 66, "Jeremias": 52, "Lamentações": 5, "Ezequiel": 48, "Daniel": 12, "Oseias": 14, "Joel": 3, "Amós": 9, "Obadias": 1, "Jonas": 4, "Miqueias": 7, "Naum": 3, "Habacuque": 3, "Sofonias": 3, "Ageu": 2, "Zacarias": 14, "Malaquias": 4, "Mateus": 28, "Marcos": 16, "Lucas": 24, "João": 21, "Atos": 28, "Romanos": 16, "1 Coríntios": 16, "2 Coríntios": 13, "Gálatas": 6, "Efésios": 6, "Filipenses": 4, "Colossenses": 4, "1 Tessalonicenses": 5, "2 Tessalonicenses": 3, "1 Timóteo": 6, "2 Timóteo": 4, "Tito": 3, "Filemom": 1, "Hebreus": 13, "Tiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 João": 5, "2 João": 1, "3 João": 1, "Judas": 1, "Apocalipse": 22
};

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromUrl = urlParams.get('groupId');
    const difficultyFromUrl = urlParams.get('difficulty');
    if (groupIdFromUrl) {
        sessionStorage.setItem('currentGroupId', groupIdFromUrl);
        if (difficultyFromUrl) {
            sessionStorage.setItem('currentGroupDifficulty', difficultyFromUrl);
        }
    }
    if (window.history.replaceState) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: cleanUrl}, '', cleanUrl);
    }
    populateBookSelect();
});

// --- Funções ---
function getAgeGroup(birthDateString) {
    if (!birthDateString) return "adulto";
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    if (age >= 6 && age <= 10) return "crianca";
    if (age >= 11 && age <= 16) return "adolescente";
    return "adulto";
}

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
    document.body.classList.remove('tema-crianca');
    if (userPhotoBorder) userPhotoBorder.className = 'profile-photo-container';

    if (user) {
        currentUser = user;
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userInfoDiv) userInfoDiv.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (userNameSpan) userNameSpan.textContent = user.displayName || "Jogador";
        if (userPhotoImg) userPhotoImg.src = user.photoURL || "https://placehold.co/45x45/e0e0e0/333?text=?";
        if (profileLink) {
            profileLink.href = `perfil.html?uid=${user.uid}`;
            profileLink.classList.remove('hidden');
        }
        
        const userDoc = await saveUserToFirestore(user);
        await checkAdminStatus(user.uid);
        
        const userData = userDoc.data();

        if (userData.bordaEquipada && userData.bordaEquipada !== 'default') {
            if (userPhotoBorder) userPhotoBorder.classList.add(userData.bordaEquipada);
        }

        if (userData.dataDeNascimento) {
            const birthDate = userData.dataDeNascimento;
            currentUserAgeGroup = getAgeGroup(birthDate);
            if (currentUserAgeGroup === "crianca") {
                document.body.classList.add('tema-crianca');
            }
        } else {
            if(dobModal) dobModal.classList.add('visible');
        }

        const groupIdFromSession = sessionStorage.getItem('currentGroupId');
        const groupDifficultyFromSession = sessionStorage.getItem('currentGroupDifficulty');
        if (groupIdFromSession && groupDifficultyFromSession) {
            await updateUiforGroupMode();
            startQuiz(groupDifficultyFromSession);
        } else {
            if (mainMenu) mainMenu.classList.remove('hidden');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
            await loadUserGroups(user.uid); 
        }
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
                email: user.email || "",
                fotoURL: user.photoURL || "https://placehold.co/150x150/e0e0e0/333?text=?",
                admin: false,
                bio: "Novo no Quiz Bíblico!",
                dataDeNascimento: null,
                showInRanking: true,
                stats: { pontuacaoTotal: 0, quizzesJogadosTotal: 0, respostasCertasTotal: 0, respostasErradasTotal: 0 },
                conquistas: [],
                bordasDesbloqueadas: ["default", "simples_azul", "simples_verde", "simples_roxo"],
                bordaEquipada: "default"
            });
        } else {
            const updateData = {};
            if (user.displayName) updateData.nome = user.displayName;
            if (user.photoURL) updateData.fotoURL = user.photoURL;
            if (Object.keys(updateData).length > 0) {
                await setDoc(userRef, updateData, { merge: true });
            }
        }
        return await getDoc(userRef);
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

if(saveDobBtn) {
    saveDobBtn.addEventListener('click', async () => {
        const dobValue = dobInput.value;
        if (!dobValue) {
            alert("Por favor, selecione sua data de nascimento.");
            return;
        }
        if (currentUser) {
            try {
                const userRef = doc(db, 'usuarios', currentUser.uid);
                await updateDoc(userRef, { dataDeNascimento: dobValue });
                currentUserAgeGroup = getAgeGroup(dobValue);
                if (currentUserAgeGroup === 'crianca') {
                    document.body.classList.add('tema-crianca');
                } else {
                    document.body.classList.remove('tema-crianca');
                }
                if(dobModal) dobModal.classList.remove('visible');
            } catch (error) {
                console.error("Erro ao salvar data de nascimento: ", error);
                alert("Não foi possível salvar a data. Tente novamente.");
            }
        }
    });
}

async function loadUserGroups(userId) {
    if (!groupsList) return;
    groupsList.innerHTML = '<p>Carregando seus grupos...</p>';

    try {
        const q = query(collection(db, "grupos"), where("memberUIDs", "array-contains", userId));
        const querySnapshot = await getDocs(q);
        
        groupsList.innerHTML = ''; 

        if (querySnapshot.empty) {
            groupsList.innerHTML = '<p style="text-align: center; color: #666;">Você ainda não faz parte de nenhum grupo.</p>';
            return;
        }

        querySnapshot.forEach(doc => {
            const group = doc.data();
            const groupId = doc.id;
            const groupElement = document.createElement('a');
            groupElement.href = `grupo.html?id=${groupId}`;
            groupElement.className = 'group-item';
            
            const memberCountText = group.memberUIDs.length === 1 ? '1 membro' : `${group.memberUIDs.length} membros`;

            groupElement.innerHTML = `
                <span><i class="${group.groupIcon || 'fas fa-users'}" style="margin-right: 8px;"></i> ${group.nomeDoGrupo}</span>
                <span class="member-count">${memberCountText}</span>
            `;
            groupsList.appendChild(groupElement);
        });

    } catch (error) {
        console.error("Erro ao carregar grupos do usuário:", error);
        groupsList.innerHTML = '<p>Ocorreu um erro ao carregar os grupos.</p>';
    }
}


async function awardAchievement(uid, achievementKey) {
    if (!uid || !achievementKey) return;
    const userRef = doc(db, 'usuarios', uid);
    try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && !userDoc.data().conquistas?.includes(achievementKey)) {
            await updateDoc(userRef, {
                conquistas: arrayUnion(achievementKey)
            });
            console.log(`Conquista '${achievementKey}' concedida!`);
        }
    } catch(error) {
        console.error(`Erro ao conceder conquista ${achievementKey}:`, error);
    }
}

if (createGroupBtn) createGroupBtn.addEventListener('click', () => createGroupModal.classList.add('visible'));
if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => createGroupModal.classList.remove('visible'));
if (saveGroupBtn) saveGroupBtn.addEventListener('click', async () => {
    if (!groupNameInput || !groupDifficultySelect) return;
    const groupName = groupNameInput.value.trim();
    const groupDifficulty = groupDifficultySelect.value;
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
            difficulty: groupDifficulty,
            criadorUid: currentUser.uid,
            criadorNome: currentUser.displayName,
            dataCriacao: serverTimestamp(),
            groupIcon: 'fas fa-book-bible',
            memberUIDs: [currentUser.uid],
            membros: {
                [currentUser.uid]: {
                    uid: currentUser.uid,
                    nome: currentUser.displayName,
                    fotoURL: currentUser.photoURL,
                    pontuacaoNoGrupo: 0
                }
            }
        };
        await addDoc(collection(db, "grupos"), newGroup);
        await awardAchievement(currentUser.uid, 'fundador_de_grupo');
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
    sessionStorage.removeItem('currentGroupDifficulty');
    updateUiforGroupMode();
});

if (rankingCard) rankingCard.addEventListener('click', () => {
    window.location.href = 'ranking.html';
});

if (difficultySelection) difficultySelection.addEventListener('click', (e) => {
    if (e.target.matches('.btn[data-difficulty]')) {
        startQuiz(e.target.dataset.difficulty);
    }
});

async function startQuiz(difficulty) {
    quizAtualDifficulty = difficulty;
    currentGroupId = sessionStorage.getItem('currentGroupId');
    score = 0;
    correctAnswersCount = 0;
    currentQuestionIndex = 0;
    if (nextBtn) nextBtn.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';
    try {
        const q = query(
            collection(db, "perguntas"), 
            where("nivel", "==", difficulty),
            where("faixaEtaria", "array-contains", currentUserAgeGroup)
        );
        const querySnapshot = await getDocs(q);
        let allQuestions = [];
        querySnapshot.forEach(doc => allQuestions.push({ id: doc.id, ...doc.data() }));
        
        if (allQuestions.length < 10) {
            console.warn(`Poucas perguntas para ${difficulty}/${currentUserAgeGroup}. Buscando em todas as faixas etárias.`);
            const fallbackQuery = query(collection(db, "perguntas"), where("nivel", "==", difficulty));
            const fallbackSnapshot = await getDocs(fallbackQuery);
            fallbackSnapshot.forEach(doc => {
                if (!allQuestions.find(q => q.id === doc.id)) {
                    allQuestions.push({ id: doc.id, ...doc.data() });
                }
            });
        }
        
        questions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        if (questions.length > 0) {
            switchScreen('quiz-screen');
            displayQuestion();
        } else {
            alert(`Não foram encontradas perguntas para a dificuldade ${difficulty}.`);
            switchScreen('initial-screen');
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
        
        const updates = {};
        const pontuacaoFieldName = `pontuacao${quizAtualDifficulty.charAt(0).toUpperCase() + quizAtualDifficulty.slice(1)}`;
        const quizzesJogadosFieldName = `quizzesJogados${quizAtualDifficulty.charAt(0).toUpperCase() + quizAtualDifficulty.slice(1)}`;
        const respostasCertasFieldName = `respostasCertas${quizAtualDifficulty.charAt(0).toUpperCase() + quizAtualDifficulty.slice(1)}`;
        const respostasErradasFieldName = `respostasErradas${quizAtualDifficulty.charAt(0).toUpperCase() + quizAtualDifficulty.slice(1)}`;

        updates["stats.pontuacaoTotal"] = increment(score);
        updates["stats.quizzesJogadosTotal"] = increment(1);
        updates["stats.respostasCertasTotal"] = increment(correctAnswersCount);
        updates["stats.respostasErradasTotal"] = increment(wrongAnswersCount);
        updates[`stats.${pontuacaoFieldName}`] = increment(score);
        updates[`stats.${quizzesJogadosFieldName}`] = increment(1);
        updates[`stats.${respostasCertasFieldName}`] = increment(correctAnswersCount);
        updates[`stats.${respostasErradasFieldName}`] = increment(wrongAnswersCount);

        await updateDoc(userRef, updates);

        if (currentGroupId) {
            const groupRef = doc(db, 'grupos', currentGroupId);
            await updateDoc(groupRef, {
                [`membros.${currentUser.uid}.pontuacaoNoGrupo`]: increment(score)
            });
        }
        await checkAndAwardAchievements(userRef, score, correctAnswersCount);
    } catch (error) {
        console.error("Erro ao atualizar estatísticas:", error);
    }
}

async function checkAndAwardAchievements(userRef, currentQuizScore, currentQuizCorrectAnswers) {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;
    const userData = userDoc.data();
    const userAchievements = new Set(userData.conquistas || []);
    let newAchievements = [];
    const stats = userData.stats;

    if (!userAchievements.has("iniciante_da_fe") && (stats.quizzesJogadosTotal || 0) >= 1) newAchievements.push("iniciante_da_fe");
    if (!userAchievements.has("peregrino_fiel") && (stats.quizzesJogadosTotal || 0) >= 10) newAchievements.push("peregrino_fiel");
    if (!userAchievements.has("discipulo_dedicado") && (stats.quizzesJogadosTotal || 0) >= 50) newAchievements.push("discipulo_dedicado");
    if (!userAchievements.has("veterano_da_palavra") && (stats.quizzesJogadosTotal || 0) >= 100) newAchievements.push("veterano_da_palavra");
    if (!userAchievements.has("erudito_aprendiz") && (stats.pontuacaoTotal || 0) >= 1000) newAchievements.push("erudito_aprendiz");
    if (!userAchievements.has("sabio_de_israel") && (stats.pontuacaoTotal || 0) >= 5000) newAchievements.push("sabio_de_israel");
    if (!userAchievements.has("conselheiro_real") && (stats.pontuacaoTotal || 0) >= 10000) newAchievements.push("conselheiro_real");
    if (!userAchievements.has("patriarca_do_saber") && (stats.pontuacaoTotal || 0) >= 25000) newAchievements.push("patriarca_do_saber");
    if (!userAchievements.has("mestre_da_palavra") && (stats.respostasCertasTotal || 0) >= 100) newAchievements.push("mestre_da_palavra");
    if (!userAchievements.has("escriba_habil") && (stats.respostasCertasTotal || 0) >= 500) newAchievements.push("escriba_habil");
    if (!userAchievements.has("doutor_da_lei") && (stats.respostasCertasTotal || 0) >= 1000) newAchievements.push("doutor_da_lei");
    if (!userAchievements.has("quase_la") && currentQuizScore >= 90) newAchievements.push("quase_la");
    if (!userAchievements.has("perfeccionista") && currentQuizScore >= 100) newAchievements.push("perfeccionista");
    if (!userAchievements.has("impecavel") && currentQuizCorrectAnswers === questions.length) newAchievements.push("impecavel");
    if (!userAchievements.has("explorador_facil") && (stats.pontuacaoFacil || 0) >= 1000) newAchievements.push("explorador_facil");
    if (!userAchievements.has("desafiante_medio") && (stats.pontuacaoMedio || 0) >= 1000) newAchievements.push("desafiante_medio");
    if (!userAchievements.has("estrategista_dificil") && (stats.pontuacaoDificil || 0) >= 1000) newAchievements.push("estrategista_dificil");
    if (currentGroupId && !userAchievements.has("competidor")) newAchievements.push("competidor");

    if (newAchievements.length > 0) {
        await updateDoc(userRef, { conquistas: arrayUnion(...newAchievements) });
        setTimeout(() => {
            alert(`Parabéns! Você desbloqueou ${newAchievements.length} nova(s) conquista(s)!`);
        }, 500);
    }
}

if (leaveQuizBtn) {
    leaveQuizBtn.addEventListener('click', () => {
        if (confirm("Tem certeza de que deseja sair do quiz? O seu progresso nesta partida não será salvo.")) {
            sessionStorage.removeItem('currentGroupId');
            sessionStorage.removeItem('currentGroupDifficulty');
            updateUiforGroupMode();
            switchScreen('initial-screen');
            if (mainMenu) mainMenu.classList.remove('hidden');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
        }
    });
}

if (restartBtn) restartBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentGroupId');
    sessionStorage.removeItem('currentGroupDifficulty');
    updateUiforGroupMode();
    switchScreen('initial-screen');
    if (mainMenu) mainMenu.classList.remove('hidden');
    if (welcomeMessage) welcomeMessage.classList.add('hidden');
});

function populateBookSelect() {
    if (!bibleBookSelect) return;
    bibleBookSelect.innerHTML = '';
    for (const book in bibleBooks) {
        const option = document.createElement('option');
        option.value = book;
        option.textContent = book;
        bibleBookSelect.appendChild(option);
    }
    populateChapterSelect();
}
function populateChapterSelect() {
    if (!bibleBookSelect || !bibleChapterSelect) return;
    const selectedBook = bibleBookSelect.value;
    const chapterCount = bibleBooks[selectedBook];
    bibleChapterSelect.innerHTML = '';
    for (let i = 1; i <= chapterCount; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Capítulo ${i}`;
        bibleChapterSelect.appendChild(option);
    }
}
async function loadChapterText() {
    if (!bibleBookSelect || !bibleChapterSelect || !bibleTextDisplay) return;
    const book = bibleBookSelect.value;
    const chapter = bibleChapterSelect.value;
    const apiUrl = `https://bible-api.com/${book} ${chapter}?translation=almeida`;
    bibleTextDisplay.innerHTML = `<p>Carregando ${book} ${chapter}...</p>`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Não foi possível carregar o texto.');
        const data = await response.json();
        let chapterHtml = `<h3>${data.reference}</h3>`;
        data.verses.forEach(verse => {
            chapterHtml += `<p><strong>${verse.verse}</strong> ${verse.text}</p>`;
        });
        bibleTextDisplay.innerHTML = chapterHtml;
    } catch (error) {
        console.error("Erro ao buscar capítulo da Bíblia:", error);
        bibleTextDisplay.innerHTML = `<p style="color: red;">Erro ao carregar o capítulo. Tente novamente.</p>`;
    }
}
if (bibleCard) bibleCard.addEventListener('click', () => { if (bibleModal) bibleModal.classList.add('visible'); });
if (closeBibleBtn) closeBibleBtn.addEventListener('click', () => { if (bibleModal) bibleModal.classList.remove('visible'); });
if (bibleBookSelect) bibleBookSelect.addEventListener('change', populateChapterSelect);
if (loadChapterBtn) loadChapterBtn.addEventListener('click', loadChapterText);

// --- Lógica da Competição ---
if (competitionCard) competitionCard.addEventListener('click', () => {
    if(competitionLobbyModal) competitionLobbyModal.classList.add('visible');
});
if (closeLobbyBtn) closeLobbyBtn.addEventListener('click', () => {
    if(competitionLobbyModal) competitionLobbyModal.classList.remove('visible');
});
if (showCreateCompetitionBtn) showCreateCompetitionBtn.addEventListener('click', () => {
    if(createCompetitionModal) createCompetitionModal.classList.add('visible');
});
if (cancelCreateCompetitionBtn) cancelCreateCompetitionBtn.addEventListener('click', () => {
    if(createCompetitionModal) createCompetitionModal.classList.remove('visible');
});
if (createCompetitionBtn) createCompetitionBtn.addEventListener('click', async () => {
    if (!currentUser) return alert("Você precisa estar logado.");
    
    const difficulty = competitionDifficultySelect.value;
    const numQuestions = parseInt(competitionQuestionsSelect.value);
    const minPlayers = parseInt(competitionMinPlayersInput.value);

    if(minPlayers < 2) {
        alert("O mínimo de participantes deve ser 2 ou mais.");
        return;
    }
    
    createCompetitionBtn.disabled = true;
    createCompetitionBtn.textContent = "Verificando...";

    try {
        const inviteCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        
        const primaryQuery = query(
            collection(db, "perguntas"),
            where("nivel", "==", difficulty),
            where("faixaEtaria", "array-contains", currentUserAgeGroup)
        );
        const primarySnapshot = await getDocs(primaryQuery);
        let allAvailableQuestions = primarySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (allAvailableQuestions.length < numQuestions) {
            console.warn(`Apenas ${allAvailableQuestions.length} perguntas encontradas para ${difficulty}/${currentUserAgeGroup}. Buscando em todas as faixas etárias.`);
            const fallbackQuery = query(collection(db, "perguntas"), where("nivel", "==", difficulty));
            const fallbackSnapshot = await getDocs(fallbackQuery);
            
            fallbackSnapshot.forEach(doc => {
                if (!allAvailableQuestions.find(q => q.id === doc.id)) {
                    allAvailableQuestions.push({ id: doc.id, ...doc.data() });
                }
            });
        }

        if (allAvailableQuestions.length < numQuestions) {
            throw new Error(`Não há perguntas suficientes para esta configuração. Encontradas: ${allAvailableQuestions.length}, Necessárias: ${numQuestions}.`);
        }

        const competitionQuestions = allAvailableQuestions.sort(() => 0.5 - Math.random()).slice(0, numQuestions);

        const competitionRef = await addDoc(collection(db, "competicoes"), {
            codigoConvite: inviteCode,
            criadorUid: currentUser.uid,
            estado: "aguardando",
            dificuldade: difficulty,
            numPerguntas: numQuestions,
            minParticipantes: minPlayers,
            perguntas: competitionQuestions,
            participantes: {
                [currentUser.uid]: {
                    nome: currentUser.displayName,
                    fotoURL: currentUser.photoURL,
                    pontuacao: 0,
                    respostas: [],
                    team: null // 'azul' or 'amarelo'
                }
            },
            dataCriacao: serverTimestamp()
        });
        activeCompetitionId = competitionRef.id;
        showWaitingRoom(true);

    } catch (error) {
        console.error("Erro ao criar competição:", error);
        alert(error.message);
    } finally {
        createCompetitionBtn.disabled = false;
        createCompetitionBtn.textContent = "Criar Sala";
        if(createCompetitionModal) createCompetitionModal.classList.remove('visible');
        if(competitionLobbyModal) competitionLobbyModal.classList.remove('visible');
    }
});
if (joinCompetitionBtn) joinCompetitionBtn.addEventListener('click', async () => {
    if (!currentUser) return alert("Você precisa estar logado.");
    
    const code = joinCodeInput.value.trim().toUpperCase();
    if (code.length < 5) return alert("Código inválido.");

    joinCompetitionBtn.disabled = true;
    joinCompetitionBtn.textContent = "...";

    try {
        const q = query(collection(db, "competicoes"), where("codigoConvite", "==", code), where("estado", "==", "aguardando"));
        const competitionSnapshot = await getDocs(q);

        if (competitionSnapshot.empty) {
            throw new Error("Sala não encontrada ou já iniciada.");
        }

        const competitionDoc = competitionSnapshot.docs[0];
        const competitionRef = doc(db, 'competicoes', competitionDoc.id);

        await updateDoc(competitionRef, {
            [`participantes.${currentUser.uid}`]: {
                nome: currentUser.displayName,
                fotoURL: currentUser.photoURL,
                pontuacao: 0,
                respostas: [],
                team: null
            }
        });
        activeCompetitionId = competitionDoc.id;
        showWaitingRoom(false);

    } catch (error) {
        console.error("Erro ao entrar na competição:", error);
        alert(error.message);
    } finally {
        joinCompetitionBtn.disabled = false;
        joinCompetitionBtn.textContent = "Entrar";
        joinCodeInput.value = '';
        if(competitionLobbyModal) competitionLobbyModal.classList.remove('visible');
    }
});

async function selectTeam(team) {
    if(!activeCompetitionId || !currentUser) return;
    const competitionRef = doc(db, 'competicoes', activeCompetitionId);
    try {
        await updateDoc(competitionRef, {
            [`participantes.${currentUser.uid}.team`]: team
        });
    } catch(error) {
        console.error("Erro ao selecionar equipe:", error);
    }
}

teamAzulBox.addEventListener('click', () => selectTeam('azul'));
teamAmareloBox.addEventListener('click', () => selectTeam('amarelo'));

function showWaitingRoom(isCreator) {
    if(waitingRoomModal) waitingRoomModal.classList.add('visible');
    if(startCompetitionBtn) startCompetitionBtn.classList.toggle('hidden', !isCreator);

    if (unsubscribeCompetition) unsubscribeCompetition();

    unsubscribeCompetition = onSnapshot(doc(db, 'competicoes', activeCompetitionId), (docSnapshot) => {
        if (!docSnapshot.exists()) {
            alert("A sala de competição foi fechada pelo criador.");
            leaveWaitingRoom();
            return;
        }

        const data = docSnapshot.data();
        if(inviteCodeDisplay) inviteCodeDisplay.textContent = data.codigoConvite;
        
        // Limpa listas
        teamAzulList.innerHTML = '';
        teamAmareloList.innerHTML = '';

        const participantes = data.participantes || {};
        const participantesArray = Object.values(participantes);

        Object.entries(participantes).forEach(([uid, player]) => {
            const playerElement = document.createElement('li');
            playerElement.innerHTML = `<img src="${player.fotoURL || 'https://placehold.co/30x30/e0e0e0/333?text=?'}" alt="Foto de ${player.nome}"> <span>${player.nome}</span>`;
            if(player.team === 'azul') {
                teamAzulList.appendChild(playerElement);
            } else if (player.team === 'amarelo') {
                teamAmareloList.appendChild(playerElement);
            } else {
                 // Jogador ainda não escolheu, pode-se adicionar a uma lista de 'sem equipe' se quiser
            }
        });

        const myTeam = participantes[currentUser.uid]?.team;
        teamAzulBox.classList.toggle('selected', myTeam === 'azul');
        teamAmareloBox.classList.toggle('selected', myTeam === 'amarelo');


        // Lógica para habilitar o botão de início
        if(isCreator && startCompetitionBtn) {
            const playerCount = participantesArray.length;
            if(playerCount >= data.minParticipantes) {
                startCompetitionBtn.disabled = false;
                startRequirementMessage.classList.add('hidden');
            } else {
                startCompetitionBtn.disabled = true;
                startRequirementMessage.textContent = `São necessários pelo menos ${data.minParticipantes} jogadores para começar. Atuais: ${playerCount}.`;
                startRequirementMessage.classList.remove('hidden');
            }
        }

        if (data.estado === 'em_andamento') {
            if (unsubscribeCompetition) unsubscribeCompetition();
            if(waitingRoomModal) waitingRoomModal.classList.remove('visible');
            alert("A competição vai começar!");
            startCompetitionQuiz(data.perguntas);
        }
    });

    listenToChat();
}

function listenToChat() {
    if (unsubscribeChat) unsubscribeChat();
    const messagesRef = collection(db, 'competicoes', activeCompetitionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        if(!chatMessagesDiv) return;
        chatMessagesDiv.innerHTML = '';
        snapshot.forEach(doc => {
            const message = doc.data();
            const messageEl = document.createElement('div');
            messageEl.classList.add('chat-message');
            if(message.uid === currentUser.uid) {
                messageEl.classList.add('my-message');
            }
            messageEl.innerHTML = `
                <span class="message-sender">${message.senderName}</span>
                <div class="message-bubble">${message.text}</div>
            `;
            chatMessagesDiv.appendChild(messageEl);
        });
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
}

if(chatFormWaitingRoom) {
    chatFormWaitingRoom.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = chatInputWaitingRoom.value.trim();
        if(messageText.length === 0 || !currentUser || !activeCompetitionId) return;

        chatInputWaitingRoom.value = '';
        try {
            const messagesRef = collection(db, 'competicoes', activeCompetitionId, 'messages');
            await addDoc(messagesRef, {
                text: messageText,
                uid: currentUser.uid,
                senderName: currentUser.displayName,
                timestamp: serverTimestamp()
            });
        } catch(error) {
            console.error("Erro ao enviar mensagem:", error);
            chatInputWaitingRoom.value = messageText; // Retorna a mensagem ao input se falhar
        }
    });
}

function startCompetitionQuiz(competitionQuestions) {
    score = 0;
    correctAnswersCount = 0;
    currentQuestionIndex = 0;
    questions = competitionQuestions;

    if (nextBtn) nextBtn.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';

    if (questions.length > 0) {
        switchScreen('quiz-screen');
        displayQuestion();
    } else {
        alert("Erro: Nenhuma pergunta foi carregada para a competição.");
        switchScreen('initial-screen');
    }
}

if(startCompetitionBtn) startCompetitionBtn.addEventListener('click', async () => {
    if(!activeCompetitionId) return;
    const competitionRef = doc(db, 'competicoes', activeCompetitionId);
    await updateDoc(competitionRef, { estado: 'em_andamento' });
});
if(leaveWaitingRoomBtn) leaveWaitingRoomBtn.addEventListener('click', leaveWaitingRoom);
async function leaveWaitingRoom() {
    const isCreator = startCompetitionBtn && !startCompetitionBtn.classList.contains('hidden');

    if(isCreator) {
        // Se o criador sai, a sala é deletada
        if(confirm("Você é o criador da sala. Sair irá fechar a sala para todos. Deseja continuar?")) {
            const competitionRef = doc(db, 'competicoes', activeCompetitionId);
            const batch = writeBatch(db);
            batch.delete(competitionRef);
            await batch.commit(); // A sala será fechada para todos via onSnapshot
        } else {
            return; // O criador cancelou a saída
        }
    } else {
        // Se um participante normal sai, ele é removido da lista
        const competitionRef = doc(db, 'competicoes', activeCompetitionId);
        await updateDoc(competitionRef, {
            [`participantes.${currentUser.uid}`]: null // Firestore não tem um 'delete field', então usamos null e filtramos
        });
    }

    if (unsubscribeCompetition) unsubscribeCompetition();
    if (unsubscribeChat) unsubscribeChat();

    activeCompetitionId = null;
    if(waitingRoomModal) waitingRoomModal.classList.remove('visible');
}
