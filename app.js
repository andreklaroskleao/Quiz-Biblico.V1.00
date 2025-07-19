// Importações do Firebase e funções do Firestore
import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI (sem alterações, mas listados para contexto) ---
const loginBtn = document.getElementById('login-btn');
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const userPhotoImg = document.getElementById('user-photo');
const adminLink = document.getElementById('admin-link');
// NOVO: Adicionar uma âncora em volta da user-info para o link do perfil
const userInfoAnchor = document.getElementById('user-info-anchor'); 

const initialScreen = document.getElementById('initial-screen');
const difficultySelection = document.getElementById('difficulty-selection');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const scoreSpan = document.getElementById('score');
const feedback = document.getElementById('feedback');
const reference = document.getElementById('reference');
const nextBtn = document.getElementById('next-btn');

const finalScore = document.getElementById('final-score');
const motivationalMessage = document.getElementById('motivational-message');
const restartBtn = document.getElementById('restart-btn');

// --- Estado do Quiz ---
let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let wrongAnswersCount = 0;

// --- Autenticação ---
const provider = new GoogleAuthProvider();

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => console.error("Erro no login:", error));
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginBtn.classList.add('hidden');
        userInfoDiv.classList.remove('hidden');
        userNameSpan.textContent = user.displayName;
        userPhotoImg.src = user.photoURL;
        difficultySelection.classList.remove('hidden');
        
        if(userInfoAnchor) {
            userInfoAnchor.href = `perfil.html?uid=${user.uid}`;
        }

        await saveUserToFirestore(user);
        await checkAdminStatus(user.uid);
    } else {
        currentUser = null;
        loginBtn.classList.remove('hidden');
        userInfoDiv.classList.add('hidden');
        difficultySelection.classList.add('hidden');
        adminLink.classList.add('hidden');
    }
});

// ATUALIZADO: Salva o usuário com o novo campo 'aceitaRanking'
async function saveUserToFirestore(user) {
    const userRef = doc(db, 'usuarios', user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            nome: user.displayName,
            email: user.email,
            fotoURL: user.photoURL,
            admin: false,
            bio: "Novo no Quiz Bíblico!",
            aceitaRanking: false, // O usuário começa fora do ranking por padrão
            stats: {
                pontuacaoTotal: 0,
                quizzesJogados: 0,
                respostasCertas: 0,
                respostasErradas: 0
            },
            conquistas: []
        });
    } else {
        // Garante que a foto e o nome do Google estejam sempre atualizados
        await updateDoc(userRef, {
            fotoURL: user.photoURL,
            nome: user.displayName
        });
    }
}

async function checkAdminStatus(uid) {
    const userRef = doc(db, 'usuarios', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().admin === true) {
        adminLink.classList.remove('hidden');
    }
}


// --- Lógica do Quiz ---
difficultySelection.addEventListener('click', (e) => {
    if (e.target.matches('.btn')) {
        const difficulty = e.target.dataset.difficulty;
        startQuiz(difficulty);
    }
});

async function startQuiz(difficulty) {
    initialScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    resultScreen.classList.add('hidden');
    
    score = 0;
    correctAnswersCount = 0;
    wrongAnswersCount = 0;
    currentQuestionIndex = 0;
    scoreSpan.textContent = score;
    nextBtn.classList.add('hidden');

    await fetchQuestions(difficulty);
    if (questions.length > 0) {
        displayQuestion();
    } else {
        questionText.textContent = "Não foram encontradas perguntas para esta dificuldade.";
    }
}

async function fetchQuestions(difficulty, count = 10) {
    try {
        const q = query(collection(db, "perguntas"), where("nivel", "==", difficulty));
        const querySnapshot = await getDocs(q);
        const allQuestions = [];
        querySnapshot.forEach(doc => allQuestions.push({ id: doc.id, ...doc.data() }));
        questions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, count);
    } catch (error) {
        console.error("Erro ao buscar perguntas: ", error);
    }
}

function displayQuestion() {
    feedback.textContent = '';
    reference.textContent = '';
    nextBtn.classList.add('hidden');
    optionsContainer.innerHTML = '';
    
    if (currentQuestionIndex >= questions.length) {
        showResults();
        return;
    }

    const question = questions[currentQuestionIndex];
    questionText.textContent = question.enunciado;

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
    const selectedButton = e.target;
    const selectedIndex = parseInt(selectedButton.dataset.index);
    const question = questions[currentQuestionIndex];
    const isCorrect = selectedIndex === question.correta;

    if (isCorrect) {
        selectedButton.classList.add('correct');
        feedback.textContent = 'Resposta Correta!';
        score += 10;
        correctAnswersCount++;
        scoreSpan.textContent = score;
    } else {
        selectedButton.classList.add('wrong');
        feedback.textContent = 'Resposta Errada!';
        wrongAnswersCount++;
        optionsContainer.children[question.correta].classList.add('correct');
    }
    
    reference.textContent = `Referência: ${question.referencia}`;
    Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);
    nextBtn.classList.remove('hidden');
}

nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    displayQuestion();
});

async function showResults() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    finalScore.textContent = score;
    
    motivationalMessage.textContent = '"Combati o bom combate, acabei a carreira, guardei a fé." - 2 Timóteo 4:7';

    if (!currentUser) return;

    try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        
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

    if (newAchievements.length > 0) {
        await updateDoc(userRef, {
            conquistas: arrayUnion(...newAchievements)
        });
        alert(`Parabéns! Você desbloqueou ${newAchievements.length} nova(s) conquista(s)!`);
    }
}

restartBtn.addEventListener('click', () => {
    resultScreen.classList.add('hidden');
    initialScreen.classList.remove('hidden');
});
