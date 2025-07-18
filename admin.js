import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Elementos da UI Admin
const authGuardMessage = document.getElementById('auth-guard-message');
const adminContent = document.getElementById('admin-content');
const questionsTbody = document.getElementById('questions-tbody');

// Formulário Individual
const saveBtn = document.getElementById('save-question-btn');
const cancelBtn = document.getElementById('cancel-edit-btn');
const questionIdInput = document.getElementById('question-id');
const enunciadoInput = document.getElementById('enunciado');
const alt1Input = document.getElementById('alt1');
const alt2Input = document.getElementById('alt2');
const alt3Input = document.getElementById('alt3');
const alt4Input = document.getElementById('alt4');
const corretaSelect = document.getElementById('correta');
const nivelSelect = document.getElementById('nivel');
const temaInput = document.getElementById('tema');
const referenciaInput = document.getElementById('referencia');

// Elementos de Importação/Exportação
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');

// --- Proteção de Rota (Auth Guard) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().admin === true) {
            authGuardMessage.classList.add('hidden');
            adminContent.classList.remove('hidden');
            loadQuestions();
        } else {
            authGuardMessage.innerHTML = '<h2>Acesso Negado</h2><p>Você não tem permissão para acessar esta página.</p>';
        }
    } else {
        authGuardMessage.innerHTML = '<h2>Acesso Negado</h2><p>Faça o login como administrador para continuar.</p>';
    }
});

// --- Lógica CRUD ---

// Carregar (Read) as perguntas
async function loadQuestions() {
    questionsTbody.innerHTML = '<tr><td colspan="3">Carregando perguntas...</td></tr>';
    const querySnapshot = await getDocs(collection(db, "perguntas"));
    questionsTbody.innerHTML = ''; // Limpa a mensagem de "carregando"
    if (querySnapshot.empty) {
        questionsTbody.innerHTML = '<tr><td colspan="3">Nenhuma pergunta cadastrada.</td></tr>';
        return;
    }
    querySnapshot.forEach((doc) => {
        const question = doc.data();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${question.enunciado}</td>
            <td>${question.nivel}</td>
            <td>
                <button class="btn edit-btn" data-id="${doc.id}">Editar</button>
                <button class="btn delete-btn" data-id="${doc.id}" style="background-color: var(--danger-color);">Excluir</button>
            </td>
        `;
        questionsTbody.appendChild(row);
    });
}

// Salvar (Create/Update) pergunta
saveBtn.addEventListener('click', async () => {
    const questionId = questionIdInput.value;
    
    const questionData = {
        enunciado: enunciadoInput.value,
        alternativas: [alt1Input.value, alt2Input.value, alt3Input.value, alt4Input.value],
        correta: parseInt(corretaSelect.value),
        nivel: nivelSelect.value,
        tema: temaInput.value,
        referencia: referenciaInput.value,
        ultimaAtualizacao: serverTimestamp()
    };

    try {
        if (questionId) {
            const questionRef = doc(db, 'perguntas', questionId);
            await updateDoc(questionRef, questionData);
            alert('Pergunta atualizada com sucesso!');
        } else {
            await addDoc(collection(db, "perguntas"), questionData);
            alert('Pergunta adicionada com sucesso!');
        }
        resetForm();
        loadQuestions();
    } catch (error) {
        console.error("Erro ao salvar pergunta: ", error);
        alert('Ocorreu um erro ao salvar.');
    }
});

// Editar e Excluir
questionsTbody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const questionRef = doc(db, 'perguntas', id);
        const docSnap = await getDoc(questionRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            questionIdInput.value = id;
            enunciadoInput.value = data.enunciado;
            [alt1Input.value, alt2Input.value, alt3Input.value, alt4Input.value] = data.alternativas;
            corretaSelect.value = data.correta;
            nivelSelect.value = data.nivel;
            temaInput.value = data.tema;
            referenciaInput.value = data.referencia;
            
            saveBtn.textContent = 'Atualizar Pergunta';
            cancelBtn.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    }

    if (target.classList.contains('delete-btn')) {
        if (confirm('Tem certeza que deseja excluir esta pergunta?')) {
            await deleteDoc(doc(db, "perguntas", id));
            alert('Pergunta excluída com sucesso!');
            loadQuestions();
        }
    }
});

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
    questionIdInput.value = '';
    enunciadoInput.value = '';
    alt1Input.value = '';
    alt2Input.value = '';
    alt3Input.value = '';
    alt4Input.value = '';
    corretaSelect.value = '0';
    nivelSelect.value = 'facil';
    temaInput.value = '';
    referenciaInput.value = '';
    saveBtn.textContent = 'Salvar Pergunta';
    cancelBtn.classList.add('hidden');
}

// --- LÓGICA DE IMPORTAÇÃO E EXPORTAÇÃO ---

// EXPORTAR
exportBtn.addEventListener('click', async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "perguntas"));
        const perguntas = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            delete data.ultimaAtualizacao;
            perguntas.push(data);
        });

        if (perguntas.length === 0) {
            alert("Nenhuma pergunta encontrada para exportar.");
            return;
        }

        const jsonString = JSON.stringify(perguntas, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'perguntas_quiz_biblico.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`${perguntas.length} perguntas exportadas com sucesso!`);
    } catch (error) {
        console.error("Erro ao exportar perguntas: ", error);
        alert("Ocorreu um erro ao exportar as perguntas.");
    }
});

// IMPORTAR
importBtn.addEventListener('click', () => {
    const file = importFileInput.files[0];
    if (!file) {
        alert("Por favor, selecione um arquivo JSON para importar.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const perguntas = JSON.parse(event.target.result);
            if (!Array.isArray(perguntas) || perguntas.length === 0) {
                alert("O arquivo JSON é inválido ou está vazio.");
                return;
            }

            const userConfirmed = confirm(`Você tem certeza que deseja importar ${perguntas.length} perguntas? Esta ação adicionará novas perguntas ao banco de dados.`);
            if (!userConfirmed) return;

            const batch = writeBatch(db);
            const perguntasCollection = collection(db, "perguntas");
            let importedCount = 0;

            perguntas.forEach(pergunta => {
                if (pergunta.enunciado && Array.isArray(pergunta.alternativas) && pergunta.correta !== undefined && pergunta.nivel) {
                    const newQuestionRef = doc(perguntasCollection);
                    batch.set(newQuestionRef, {
                        ...pergunta,
                        ultimaAtualizacao: serverTimestamp()
                    });
                    importedCount++;
                } else {
                    console.warn("Pergunta ignorada por ter formato inválido:", pergunta);
                }
            });

            await batch.commit();
            alert(`${importedCount} perguntas importadas com sucesso! A lista será atualizada.`);
            loadQuestions();
            importFileInput.value = ''; // Limpa o input do arquivo
        } catch (error) {
            console.error("Erro ao importar o arquivo: ", error);
            alert("Ocorreu um erro ao processar o arquivo JSON. Verifique o console para mais detalhes.");
        }
    };
    reader.readAsText(file);
});
