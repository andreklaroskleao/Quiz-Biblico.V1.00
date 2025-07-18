import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos da UI ---
const loadingDiv = document.getElementById('loading-group');
const contentDiv = document.getElementById('group-content');
const notFoundDiv = document.getElementById('group-not-found');
const groupNameH2 = document.getElementById('group-name');
const groupCreatorSpan = document.getElementById('group-creator');
const rankingTbody = document.getElementById('ranking-tbody');
const groupActionsDiv = document.getElementById('group-actions');

let currentUser = null;
let groupId = null;
let groupData = null;

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
    loadingDiv.classList.remove('hidden');
    contentDiv.classList.add('hidden');
    notFoundDiv.classList.add('hidden');

    try {
        const groupRef = doc(db, 'grupos', groupId);
        const groupDoc = await getDoc(groupRef);

        if (groupDoc.exists()) {
            groupData = groupDoc.data();
            displayGroupData();
            contentDiv.classList.remove('hidden');
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error("Erro ao carregar grupo:", error);
        showNotFound();
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

function displayGroupData() {
    groupNameH2.textContent = groupData.nomeDoGrupo;
    groupCreatorSpan.textContent = groupData.criadorNome;

    const members = Object.values(groupData.membros).sort((a, b) => b.pontuacaoNoGrupo - a.pontuacaoNoGrupo);

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

    updateActionButtons();
}

function updateActionButtons() {
    groupActionsDiv.innerHTML = '';
    if (!currentUser) {
        groupActionsDiv.innerHTML = '<p>Faça login para interagir com o grupo.</p>';
        return;
    }

    const isMember = groupData.memberUIDs.includes(currentUser.uid);

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
}

async function joinGroup() {
    if (!currentUser || !groupData) return;
    const joinBtn = groupActionsDiv.querySelector('button');
    joinBtn.disabled = true;
    joinBtn.textContent = 'Entrando...';

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
        alert('Você entrou no grupo!');
        loadGroupData();
    } catch (error) {
        console.error("Erro ao entrar no grupo:", error);
        alert("Não foi possível entrar no grupo.");
        joinBtn.disabled = false;
        joinBtn.innerHTML = '<i class="fas fa-user-plus"></i> Entrar no Grupo';
    }
}

function showNotFound() {
    loadingDiv.classList.add('hidden');
    contentDiv.classList.add('hidden');
    notFoundDiv.classList.remove('hidden');
}
