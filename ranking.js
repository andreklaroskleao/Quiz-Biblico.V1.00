import { db } from './firebase.js';
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const rankingTbody = document.getElementById('ranking-tbody');

window.addEventListener('DOMContentLoaded', async () => {
    await loadGeneralRanking();
});

async function loadGeneralRanking() {
    rankingTbody.innerHTML = '<tr><td colspan="3">Carregando ranking...</td></tr>';
    try {
        const q = query(
            collection(db, "usuarios"), 
            where("showInRanking", "==", true),
            orderBy("stats.pontuacaoTotal", "desc"), 
            limit(100)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            rankingTbody.innerHTML = '<tr><td colspan="3">Nenhum jogador no ranking ainda. Jogue para aparecer aqui!</td></tr>';
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
