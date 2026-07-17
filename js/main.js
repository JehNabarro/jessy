// main.js — ponto de entrada da aplicação (ES module)
//
// Responsabilidades:
// 1. Renderizar a home a partir do <template id="home">
// 2. Iniciar o header (auto-hide + drawer)
// 3. Iniciar o Chat Jessy no estado expandido dentro da home

import { initHeader } from './header.js';
import { initChat } from './chat.js';

// ------------------------------------------------------------
// Renderiza a home clonando o template para dentro do <main>
// ------------------------------------------------------------
function renderizarHome() {
    const template = document.getElementById('home');
    const main = document.querySelector('main');
    if (!template || !main) {
        console.error('Home: template "#home" ou <main> não encontrados.');
        return null;
    }
    const secao = template.content.firstElementChild.cloneNode(true);
    // A section entra antes do chat (que é filho direto do main)
    main.prepend(secao);
    return secao;
}

const home = renderizarHome();

initHeader();

// O chat é montado no slot da home (estado expandido padrão)
initChat(
    document.getElementById('chat-jessy-ia'),
    home ? home.querySelector('#chat-slot') : null
);
