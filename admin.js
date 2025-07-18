import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const adminContent = document.getElementById('admin-content');
const authGuardMessage = document.getElementById('auth-guard-message');
const questionsTbody = document.getElementById('questions-tbody');

// Formulário
const formTitle = document.getElementById('form-title');
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

// Import/Export
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');

// --- Proteção de Rota ---
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
        authGuardMessage.innerHTML = '<h2>Acesso Negado</h2><p>Faça login como administrador para continuar.</p>';
    }
});

// --- Lógica CRUD ---

// Carregar (Read) as perguntas
async function loadQuestions() {
    questionsTbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "perguntas"));
        if (querySnapshot.empty) {
            questionsTbody.innerHTML = '<tr><td colspan="3">Nenhuma pergunta cadastrada.</td></tr>';
            return;
        }
        questionsTbody.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const question = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${question.enunciado}</td>
                <td>${question.nivel}</td>
                <td class="actions-cell">
                    <button class="btn edit-btn" data-id="${doc.id}">Editar</button>
                    <button class="btn delete-btn" data-id="${doc.id}" style="background: var(--danger-color);">Excluir</button>
                </td>
            `;
            questionsTbody.appendChild(row);
        });
    } catch (error) {
        console.error("Erro ao carregar perguntas:", error);
        questionsTbody.innerHTML = '<tr><td colspan="3">Erro ao carregar perguntas.</td></tr>';
    }
}

// Salvar (Create/Update) pergunta
saveBtn.addEventListener('click', async () => {
    const questionId = questionIdInput.value;
    
    const questionData = {
        enunciado: enunciadoInput.value.trim(),
        alternativas: [
            alt1Input.value.trim(),
            alt2Input.value.trim(),
            alt3Input.value.trim(),
            alt4Input.value.trim()
        ],
        correta: parseInt(corretaSelect.value),
        nivel: nivelSelect.value,
        tema: temaInput.value.trim().toLowerCase(),
        referencia: referenciaInput.value.trim(),
        ultimaAtualizacao: serverTimestamp()
    };

    if (!questionData.enunciado || questionData.alternativas.some(alt => !alt)) {
        alert("Por favor, preencha todos os campos da pergunta e das alternativas.");
        return;
    }

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

// Lidar com cliques na tabela (Editar e Excluir)
questionsTbody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const questionRef = doc(db, 'perguntas', id);
        const docSnap = await getDoc(questionRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            formTitle.textContent = 'Editar Pergunta';
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
        if (confirm('Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.')) {
            try {
                await deleteDoc(doc(db, "perguntas", id));
                alert('Pergunta excluída com sucesso!');
                loadQuestions();
            } catch (error) {
                console.error("Erro ao excluir pergunta:", error);
                alert("Ocorreu um erro ao excluir a pergunta.");
            }
        }
    }
});

// Botão de Cancelar Edição
cancelBtn.addEventListener('click', resetForm);

function resetForm() {
    formTitle.textContent = 'Adicionar Nova Pergunta';
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

// --- IMPORTAÇÃO E EXPORTAÇÃO ---

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
        a.download = `quiz_biblico_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Erro ao exportar perguntas: ", error);
        alert("Ocorreu um erro ao exportar.");
    }
});

// IMPORTAR
importBtn.addEventListener('click', () => {
    const file = importFileInput.files[0];
    if (!file) {
        alert("Por favor, selecione um arquivo JSON.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const perguntas = JSON.parse(event.target.result);
            if (!Array.isArray(perguntas) || perguntas.length === 0) {
                alert("Arquivo JSON inválido ou vazio.");
                return;
            }

            if (!confirm(`Deseja importar ${perguntas.length} perguntas?`)) return;

            const batch = writeBatch(db);
            const perguntasCollection = collection(db, "perguntas");
            let importedCount = 0;

            perguntas.forEach(pergunta => {
                if (pergunta.enunciado && Array.isArray(pergunta.alternativas)) {
                    const newQuestionRef = doc(perguntasCollection);
                    batch.set(newQuestionRef, {
                        ...pergunta,
                        ultimaAtualizacao: serverTimestamp()
                    });
                    importedCount++;
                }
            });

            await batch.commit();
            alert(`${importedCount} perguntas importadas com sucesso!`);
            loadQuestions();
            importFileInput.value = '';
        } catch (error) {
            console.error("Erro ao importar arquivo: ", error);
            alert("Erro ao processar o arquivo JSON.");
        }
    };
    reader.readAsText(file);
});
