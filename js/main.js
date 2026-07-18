// main.js — ponto de entrada da aplicação (ES module)
//
// Responsabilidades:
// 1. Iniciar o header (auto-hide + drawer)
// 2. Iniciar o Chat Jessy (sem slot: o router entrega o slot da
//    home ao renderizar a página inicial)
// 3. Iniciar o router, que clona a página inicial a partir do hash
//    da URL (home por padrão) e assume toda a navegação

import { initHeader } from './header.js';
import { initChat } from './chat.js';
import { initRouter } from './router.js';

initHeader();

// O chat nasce sem slot; se a página inicial for a home, o router
// chama definirSlotHome + definirEstado('expanded') na sequência
initChat(document.getElementById('chat-jessy-ia'), null);

initRouter();
