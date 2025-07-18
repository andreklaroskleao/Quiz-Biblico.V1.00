import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const userPhotoImg = document.getElementById('user-photo');
const adminLink = document.getElementById('admin-link');
const profileLink = document.getElementById('profile-link');
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
const motivationalMessage = document.getElementById('motivational-message');
const restartBtn = document.getElementById('restart-btn');

const groupsContainer = document.getElementById('groups-container');
const groupsList = document.getElementById('groups-list');
const createGroupBtn = document.getElementById('create-group-btn');
const createGroupModal = document.getElementById('create-group-modal');
const groupNameInput = document.getElementById('group-name-input');
const saveGroupBtn = document.getElementById('save-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');

// --- Estado do Quiz ---
let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;

// --- Função de Transição de Tela ---
function switchScreen(newScreenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        if (!screen.classList.contains('hidden')) {
            screen.classList.add('hidden');
        }
    });
    const screenToShow = document.getElementById(newScreenId);
    if (screenToShow) {
        screenToShow.classList.remove('hidden');
    }
}

// --- Autenticação ---
const provider = new GoogleAuthProvider();
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => console.error("Erro no login:", error));
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch(error => console.error("Erro ao deslogar:", error));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginBtn.classList.add('hidden');
        userInfoDiv.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        userNameSpan.textContent = user.displayName;
        userPhotoImg.src = user.photoURL;
        profileLink.href = `perfil.html?uid=${user.uid}`;
        profileLink.classList.remove('hidden');
        difficultySelection.classList.remove('hidden');
        groupsContainer.classList.remove('hidden');
        await saveUserToFirestore(user);
        await checkAdminStatus(user.uid);
        await loadUserGroups(user.uid);
    } else {
        currentUser = null;
        loginBtn.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        adminLink.classList.add('hidden');
        profileLink.classList.add('hidden');
        difficultySelection.classList.add('hidden');
        groupsContainer.classList.add('hidden');
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
    const userRef = doc(db, 'usuarios', uid);
    const userDoc = await getDoc(userRef);
    adminLink.classList.toggle('hidden', !(userDoc.exists() && userDoc.data().admin === true));
}

// --- Lógica de Grupos ---
async function loadUserGroups(uid) {
    groupsList.innerHTML = '<p>Carregando...</p>';
    const q = query(collection(db, "grupos"), where("memberUIDs", "array-contains", uid));
    try {
        const querySnapshot = await getDocs(q);
        groupsList.innerHTML = '';
        if (querySnapshot.empty) {
            groupsList.innerHTML = '<p>Você ainda não participa de nenhum grupo.</p>';
        }
        querySnapshot.forEach((doc) => {
            const group = doc.data();
            const groupElement = document.createElement('a');
            groupElement.href = `grupo.html?id=${doc.id}`;
            groupElement.className = 'group-item';
            groupElement.innerHTML = `
                <span>${group.nomeDoGrupo}</span>
                <span class="member-count">${group.memberUIDs.length} membros</span>
            `;
            groupsList.appendChild(groupElement);
        });
    } catch (error) {
        console.error("Erro ao carregar grupos:", error);
        groupsList.innerHTML = '<p>Não foi possível carregar os grupos.</p>';
    }
}

createGroupBtn.addEventListener('click', () => {
    createGroupModal.classList.add('visible');
});

cancelGroupBtn.addEventListener('click', () => {
    createGroupModal.classList.remove('visible');
});

saveGroupBtn.addEventListener('click', async () => {
    const groupName = groupNameInput.value.trim();
    if (groupName.length < 3) {
        alert("O nome do grupo deve ter pelo menos 3 caracteres.");
        return;
    }
    if (!currentUser) {
        alert("Você precisa estar logado para criar um grupo.");
        return;
    }

    saveGroupBtn.disabled = true;
    saveGroupBtn.textContent = 'Criando...';

    try {
        const newGroup = {
            nomeDoGrupo: groupName,
            criadorUid: currentUser.uid,
            criadorNome: currentUser.displayName,
            dataCriacao: serverTimestamp(),
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


// --- Lógica do Quiz ---
difficultySelection.addEventListener('click', (e) => {
    if (e.target.matches('.btn[data-difficulty]')) {
        startQuiz(e.target.dataset.difficulty);
    }
});

async function startQuiz(difficulty) {
    score = 0;
    correctAnswersCount = 0;
    currentQuestionIndex = 0;
    nextBtn.classList.add('hidden');
    progressBar.style.width = '0%';

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
            alert("Não foram encontradas perguntas para esta dificuldade. Adicione mais no painel de admin ou tente outra dificuldade.");
        }
    } catch (error) {
        console.error("Erro ao buscar perguntas: ", error);
        alert("Ocorreu um erro ao carregar as perguntas. Verifique o console.");
    }
}

function displayQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }
    const progress = (currentQuestionIndex / questions.length) * 100;
    progressBar.style.width = `${progress}%`;

    const question = questions[currentQuestionIndex];
    questionText.textContent = question.enunciado;
    optionsContainer.innerHTML = '';
    feedback.innerHTML = '';
    reference.innerHTML = '';
    nextBtn.classList.add('hidden');

    question.alternativas.forEach((alt, index) => {
        const button = document.createElement('button');
        button.textContent = alt;
        button.classList.add('btn', 'option-btn');
        button.dataset.index = index;
        button.addEventListener('click', handleAnswer);
        optionsContainer.appendChild(button);
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
        feedback.textContent = 'Resposta Correta!';
        score += 10;
        correctAnswersCount++;
    } else {
        selectedButton.classList.add('wrong');
        feedback.textContent = 'Resposta Errada!';
        optionsContainer.children[question.correta].classList.add('correct');
    }
    
    reference.textContent = `Referência: ${question.referencia}`;
    nextBtn.classList.remove('hidden');
    progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
}

nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    displayQuestion();
});

async function showResults() {
    switchScreen('result-screen');
    finalScore.textContent = score;
    motivationalMessage.textContent = '"Combati o bom combate, acabei a carreira, guardei a fé." - 2 Timóteo 4:7';

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
        await checkAndAwardAchievements(userRef);
    } catch (error) {
        console.error("Erro ao atualizar estatísticas do usuário:", error);
    }
}

async function checkAndAwardAchievements(userRef) {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const userAchievements = new Set(userData.conquistas || []);
    let newAchievements = [];

    if (!userAchievements.has("iniciante_da_fe")) {
        newAchievements.push("iniciante_da_fe");
    }
    if (userData.stats.pontuacaoTotal >= 1000 && !userAchievements.has("erudito_aprendiz")) {
        newAchievements.push("erudito_aprendiz");
    }
    if (userData.stats.quizzesJogados >= 10 && !userAchievements.has("peregrino_fiel")) {
        newAchievements.push("peregrino_fiel");
    }
    if (userData.stats.pontuacaoTotal >= 5000 && !userAchievements.has("sabio_de_israel")) {
        newAchievements.push("sabio_de_israel");
    }
    if (userData.stats.respostasCertas >= 100 && !userAchievements.has("mestre_da_palavra")) {
        newAchievements.push("mestre_da_palavra");
    }

    if (newAchievements.length > 0) {
        await updateDoc(userRef, { conquistas: arrayUnion(...newAchievements) });
        setTimeout(() => {
            alert(`Parabéns! Você desbloqueou ${newAchievements.length} nova(s) conquista(s)!`);
        }, 500);
    }
}

restartBtn.addEventListener('click', () => {
    switchScreen('initial-screen');
});
