import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginBtn = document.getElementById('login-btn');
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
const restartBtn = document.getElementById('restart-btn');

let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;

// Função de Transição de Tela
function switchScreen(newScreenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    const screenToShow = document.getElementById(newScreenId);
    if(screenToShow) {
        screenToShow.classList.remove('hidden');
    }
}

// --- Autenticação ---
const provider = new GoogleAuthProvider();
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => console.error("Erro no login:", error));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Esconde o botão de login e mostra as informações do usuário
        loginBtn.classList.add('hidden');
        userInfoDiv.classList.remove('hidden');

        userNameSpan.textContent = user.displayName;
        userPhotoImg.src = user.photoURL;
        profileLink.href = `perfil.html?uid=${user.uid}`;
        profileLink.classList.remove('hidden');
        difficultySelection.classList.remove('hidden');

        await saveUserToFirestore(user);
        await checkAdminStatus(user.uid);
    } else {
        currentUser = null;
        // Mostra o botão de login e esconde as informações do usuário
        loginBtn.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        
        adminLink.classList.add('hidden');
        profileLink.classList.add('hidden');
        difficultySelection.classList.add('hidden');
    }
});

async function saveUserToFirestore(user) {
    const userRef = doc(db, 'usuarios', user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        await setDoc(userRef, {
            uid: user.uid, nome: user.displayName, email: user.email, fotoURL: user.photoURL,
            admin: false, bio: "Novo no Quiz Bíblico!",
            stats: { pontuacaoTotal: 0, quizzesJogados: 0, respostasCertas: 0, respostasErradas: 0 },
            conquistas: []
        });
    } else {
        await updateDoc(userRef, { fotoURL: user.photoURL, nome: user.displayName });
    }
}

async function checkAdminStatus(uid) {
    const userRef = doc(db, 'usuarios', uid);
    const userDoc = await getDoc(userRef);
    adminLink.classList.toggle('hidden', !(userDoc.exists() && userDoc.data().admin === true));
}

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
        questions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10); // Limita a 10 perguntas

        if (questions.length > 0) {
            switchScreen('quiz-screen');
            displayQuestion();
        } else {
            alert("Não foram encontradas perguntas para esta dificuldade. Tente outra ou adicione mais no painel de admin.");
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

async function checkAndAwardAchievements(userRef) { /* ... Lógica mantida ... */ }

restartBtn.addEventListener('click', () => {
    switchScreen('initial-screen');
});
