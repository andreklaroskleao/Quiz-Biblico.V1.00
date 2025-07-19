import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loadingDiv = document.getElementById('loading-group');
const contentDiv = document.getElementById('group-content');
const notFoundDiv = document.getElementById('group-not-found');
const groupIcon = document.getElementById('group-icon');
const groupNameH2 = document.getElementById('group-name');
const groupCreatorSpan = document.getElementById('group-creator');
const rankingTbody = document.getElementById('ranking-tbody');
const groupActionsDiv = document.getElementById('group-actions');
const editGroupModal = document.getElementById('edit-group-modal');
const editGroupNameInput = document.getElementById('edit-group-name-input');
const iconSelectionDiv = document.getElementById('icon-selection');
const saveGroupBtn = document.getElementById('save-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');

let currentUser = null;
let groupId = null;
let groupData = null;
let selectedIcon = null;

const groupIcons = [
    'fas fa-book-bible', 'fas fa-cross', 'fas fa-dove', 'fas fa-church', 
    'fas fa-hands-praying', 'fas fa-lightbulb', 'fas fa-scroll', 'fas fa-star-of-david'
];

// --- Lógica Principal ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    groupId = params.get('id');
    if (!groupId) { showNotFound(); return; }
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadGroupData();
    });
});

async function loadGroupData() {
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.add('hidden');

    try {
        const groupRef = doc(db, 'grupos', groupId);
        const groupDoc = await getDoc(groupRef);

        if (groupDoc.exists()) {
            groupData = groupDoc.data();
            displayGroupData();
            if (contentDiv) contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar grupo:", error);
        showNotFound();
    } finally {
        if (loadingDiv) loadingDiv.classList.add('hidden');
    }
}

function displayGroupData() {
    if (!groupData) return;
    if (groupIcon) groupIcon.className = `group-icon ${groupData.groupIcon || 'fas fa-users'}`;
    if (groupNameH2) groupNameH2.textContent = groupData.nomeDoGrupo;
    if (groupCreatorSpan) groupCreatorSpan.textContent = groupData.criadorNome;

    const members = Object.values(groupData.membros).sort((a, b) => b.pontuacaoNoGrupo - a.pontuacaoNoGrupo);

    if (rankingTbody) {
        rankingTbody.innerHTML = '';
        members.forEach((member, index) => {
            const row = document.createElement('tr');
            const rankClass = `rank-${index + 1}`;
            row.innerHTML = `
                <td class="rank ${rankClass}">${index + 1}</td>
                <td class="member-info">
                    <img src="${member.fotoURL || 'https://placehold.co/40x40'}" alt="Foto de ${member.nome}">
                    <span>${member.nome}</span>
                </td>
                <td class="score">${member.pontuacaoNoGrupo}</td>
            `;
            rankingTbody.appendChild(row);
        });
    }

    updateActionButtons();
}

function updateActionButtons() {
    if (!groupActionsDiv) return;
    groupActionsDiv.innerHTML = '';
    if (!currentUser) {
        groupActionsDiv.innerHTML = '<p>Faça login para interagir com o grupo.</p>';
        return;
    }

    const isMember = groupData.memberUIDs.includes(currentUser.uid);
    const isCreator = currentUser.uid === groupData.criadorUid;

    if (isMember) {
        const playBtn = document.createElement('button');
        playBtn.className = 'btn';
        playBtn.innerHTML = '<i class="fas fa-play"></i> Jogar pelo Grupo';
        playBtn.addEventListener('click', () => {
            window.location.href = `index.html?groupId=${groupId}`;
        });
        groupActionsDiv.appendChild(playBtn);

        const inviteBtn = document.createElement('button');
        inviteBtn.className = 'btn btn-secondary';
        inviteBtn.innerHTML = '<i class="fas fa-share-alt"></i> Convidar Amigos';
        inviteBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert('Link de convite copiado!'))
                .catch(() => alert('Não foi possível copiar o link.'));
        });
        groupActionsDiv.appendChild(inviteBtn);
    } else {
        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn';
        joinBtn.innerHTML = '<i class="fas fa-user-plus"></i> Entrar no Grupo';
        joinBtn.addEventListener('click', joinGroup);
        groupActionsDiv.appendChild(joinBtn);
    }

    if (isCreator) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Editar';
        editBtn.addEventListener('click', openEditModal);
        groupActionsDiv.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn';
        deleteBtn.style.background = 'var(--danger-color)';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir';
        deleteBtn.addEventListener('click', deleteGroup);
        groupActionsDiv.appendChild(deleteBtn);
    }
}

async function joinGroup() {
    if (!currentUser || !groupData) return;
    const joinBtn = groupActionsDiv.querySelector('button');
    if (joinBtn) {
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    }

    const groupRef = doc(db, 'grupos', groupId);
    const newMemberData = {
        nome: currentUser.displayName || "Jogador Anônimo",
        fotoURL: currentUser.photoURL || "https://placehold.co/40x40",
        pontuacaoNoGrupo: 0
    };

    try {
        await updateDoc(groupRef, {
            [`membros.${currentUser.uid}`]: newMemberData,
            memberUIDs: arrayUnion(currentUser.uid)
        });
        
        // CORREÇÃO APLICADA AQUI:
        // Atualiza o objeto local e redesenha a UI imediatamente.
        groupData.memberUIDs.push(currentUser.uid);
        groupData.membros[currentUser.uid] = newMemberData;
        displayGroupData();

    } catch (error) {
        console.error("Erro ao entrar no grupo:", error);
        alert("Não foi possível entrar no grupo.");
        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.innerHTML = '<i class="fas fa-user-plus"></i> Entrar no Grupo';
        }
    }
}

function openEditModal() {
    if (editGroupNameInput) editGroupNameInput.value = groupData.nomeDoGrupo;
    selectedIcon = groupData.groupIcon || 'fas fa-book-bible';
    
    if (iconSelectionDiv) {
        iconSelectionDiv.innerHTML = '';
        groupIcons.forEach(iconClass => {
            const iconElement = document.createElement('i');
            iconElement.className = iconClass;
            if (iconClass === selectedIcon) {
                iconElement.classList.add('selected');
            }
            iconElement.addEventListener('click', () => {
                const currentSelected = iconSelectionDiv.querySelector('.selected');
                if (currentSelected) {
                    currentSelected.classList.remove('selected');
                }
                iconElement.classList.add('selected');
                selectedIcon = iconClass;
            });
            iconSelectionDiv.appendChild(iconElement);
        });
    }

    if (editGroupModal) editGroupModal.classList.add('visible');
}

if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => editGroupModal.classList.remove('visible'));

if (saveGroupBtn) saveGroupBtn.addEventListener('click', async () => {
    const newName = editGroupNameInput.value.trim();
    if (newName.length < 3) {
        alert("O nome do grupo deve ter pelo menos 3 caracteres.");
        return;
    }

    saveGroupBtn.disabled = true;
    saveGroupBtn.textContent = 'Salvando...';

    try {
        const groupRef = doc(db, 'grupos', groupId);
        await updateDoc(groupRef, {
            nomeDoGrupo: newName,
            groupIcon: selectedIcon
        });
        if (editGroupModal) editGroupModal.classList.remove('visible');
        await loadGroupData();
    } catch (error) {
        console.error("Erro ao editar grupo:", error);
        alert("Não foi possível salvar as alterações.");
    } finally {
        saveGroupBtn.disabled = false;
        saveGroupBtn.textContent = 'Salvar';
    }
});

async function deleteGroup() {
    if (confirm(`Tem certeza que deseja excluir o grupo "${groupData.nomeDoGrupo}"? Esta ação não pode ser desfeita.`)) {
        try {
            await deleteDoc(doc(db, 'grupos', groupId));
            alert("Grupo excluído com sucesso.");
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Erro ao excluir grupo:", error);
            alert("Não foi possível excluir o grupo.");
        }
    }
}

function showNotFound() {
    if (loadingDiv) loadingDiv.classList.add('hidden');
    if (contentDiv) contentDiv.classList.add('hidden');
    if (notFoundDiv) notFoundDiv.classList.remove('hidden');
}
