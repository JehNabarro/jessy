// router.js — fonte única de navegação entre as páginas
//
// Modelo:
// - Cada destino é um <template> no index.html; o conteúdo só é
//   clonado no momento da navegação e o anterior é REMOVIDO do DOM
//   ao sair (nada de acumular nós escondidos)
// - A URL é sincronizada via hash (#coinple, #sobre...) e o botão
//   voltar/avançar do navegador funciona via evento hashchange
// - document.title é atualizado por página
// - Animações apenas com transform/opacity (Web Animations API),
//   com durações, easings e deslocamento lidos dos tokens do CSS —
//   nenhum valor fixo novo aqui
// - Com prefers-reduced-motion o conteúdo troca sem animação
// - O Chat Jessy acompanha: fora da home vai para o estado "bar";
//   de volta à home é reancorado no #chat-slot e expandido

import { definirEstado, definirSlotHome } from './chat.js';

// ------------------------------------------------------------
// Registro das páginas: id = id do <template> = hash da URL
// ------------------------------------------------------------
const paginas = {
    home: { titulo: 'Portfolio — Jéssica Nabarro' },
    projetos: { titulo: 'Projetos — Jéssica Nabarro' },
    coinple: { titulo: 'Coinple — Jéssica Nabarro' },
    momentos: { titulo: 'Momentos — Jéssica Nabarro' },
    diagnostico: { titulo: 'Diagnóstico de Liderança — Jéssica Nabarro' },
    motorline: { titulo: 'Motorline — Jéssica Nabarro' },
    sobre: { titulo: 'Quem sou eu — Jéssica Nabarro' },
    contato: { titulo: 'Contato — Jéssica Nabarro' }
};

// ------------------------------------------------------------
// Estado do roteador
// ------------------------------------------------------------
let mainEl = null;
let paginaAtual = null;  // id da página visível
let secaoAtual = null;   // section clonada atualmente dentro do <main>
let navegacaoId = 0;     // invalida animações de navegações antigas

// Preferência do usuário: com redução de movimento a troca é seca
const reducaoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

// Tokens de movimento, lidos uma vez na inicialização (o CSS já
// carregou porque os módulos rodam depois do parse)
let mov = null;

function lerTokens() {
    const estilo = getComputedStyle(document.documentElement);
    const token = (nome) => estilo.getPropertyValue(nome).trim();
    const tokenMs = (nome, padrao) => {
        const valor = parseFloat(token(nome));
        return Number.isFinite(valor) ? valor : padrao;
    };
    mov = {
        saidaMs: tokenMs('--duracao-md', 600),
        entradaMs: tokenMs('--duracao-lg', 800),
        easeSaida: token('--ease-saida') || 'ease-in',
        easeEntrada: token('--ease-entrada') || 'ease-out',
        deslocamento: token('--esp-lg') || '30px'
    };
}

// ------------------------------------------------------------
// Animações de troca — só transform e opacity (compositor)
// ------------------------------------------------------------
function animarSaida(el) {
    return el.animate(
        [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: `translateY(calc(${mov.deslocamento} * -1))` }
        ],
        { duration: mov.saidaMs, easing: mov.easeSaida, fill: 'forwards' }
    ).finished.catch(() => { });
}

function animarEntrada(el) {
    el.animate(
        [
            { opacity: 0, transform: `translateY(${mov.deslocamento})` },
            { opacity: 1, transform: 'none' }
        ],
        { duration: mov.entradaMs, easing: mov.easeEntrada }
    );
}

// ------------------------------------------------------------
// Clona a section do <template> correspondente ao id
// ------------------------------------------------------------
function clonarPagina(id) {
    const template = document.getElementById(id);
    if (!template || !template.content.firstElementChild) {
        console.error(`Router: template "#${id}" não encontrado.`);
        return null;
    }
    return template.content.firstElementChild.cloneNode(true);
}

// Traduz o hash atual em um id de página conhecido
function idDoHash() {
    const bruto = decodeURIComponent(location.hash.replace('#', ''));
    return paginas[bruto] ? bruto : 'home';
}

// ------------------------------------------------------------
// Navegação — usada pelo chat (nós com página), pelo menu drawer
// e pelo hashchange do navegador
// ------------------------------------------------------------
export async function navegarPara(id) {
    if (!mainEl || !paginas[id] || id === paginaAtual) return;

    const idNav = ++navegacaoId;
    const primeira = paginaAtual === null; // render inicial (load)
    const anterior = secaoAtual;
    paginaAtual = id;

    // Sincroniza a URL (o hashchange disparado por esta atribuição
    // é ignorado: paginaAtual já aponta para o destino). No load da
    // home sem hash, a URL fica limpa
    if (location.hash !== `#${id}` && !(primeira && id === 'home' && !location.hash)) {
        location.hash = id;
    }
    document.title = paginas[id].titulo;

    // O chat sai do slot da home para a barra ANTES de remover a
    // hero (o slot vive dentro dela); na volta é reancorado depois
    if (id !== 'home') definirEstado('bar');

    const animar = !reducaoMovimento.matches && !primeira;

    // 1. Conteúdo atual sai (fade + sobe) e é removido do DOM
    if (anterior) {
        if (animar) {
            await animarSaida(anterior);
            if (idNav !== navegacaoId) return; // outra navegação assumiu
        }
        anterior.remove();
    }

    // 2. Conteúdo novo é clonado do template e entra no <main>
    const secao = clonarPagina(id);
    if (!secao) return;
    window.scrollTo(0, 0);
    mainEl.prepend(secao);
    secaoAtual = secao;

    // De volta à home: o chat volta ao slot e expande
    if (id === 'home') {
        definirSlotHome(secao.querySelector('#chat-slot'));
        definirEstado('expanded');
    }

    if (animar) animarEntrada(secao);

    // Foco no h1 do conteúdo novo (tabindex="-1" nos templates);
    // no load inicial o foco não é roubado
    if (!primeira) {
        const h1 = secao.querySelector('h1');
        if (h1) h1.focus({ preventScroll: true });
    }
}

// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------
export function initRouter() {
    mainEl = document.querySelector('main');
    if (!mainEl) {
        console.error('Router: <main> não encontrado. Navegação desativada.');
        return;
    }
    lerTokens();

    // Botão voltar/avançar e âncoras nativas (ex.: marca do header)
    window.addEventListener('hashchange', () => navegarPara(idDoHash()));

    // Página inicial: respeita deep link via hash ou cai na home
    navegarPara(idDoHash());

    // API global para consistência com autoHideHeader e jessyChat
    window.router = { navegarPara };
}
