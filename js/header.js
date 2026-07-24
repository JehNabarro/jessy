// header.js — navegação: auto-hide do header + drawer lateral
//
// Auto-hide:
// - Compara a posição de scroll atual com a anterior e alterna a
//   classe .header--oculto (a animação é 100% CSS via transform)
// - No topo da página o header fica sempre visível
// - Threshold de 10px ignora micro-scrolls
// - Listener passivo com throttle via requestAnimationFrame
// - Os overlays de case têm scroll próprio: observarScroll(container)
//   troca o alvo escutado (página ou overlay)
// - Com o drawer aberto (body.drawer-aberto) o header nunca se esconde

const LIMIAR = 10; // px: delta mínimo para reagir (ignora micro-scrolls)

let header = null;
let containerAtual = window; // alvo de scroll ativo (window ou overlay)
let ultimoY = 0;             // posição de scroll do frame anterior
let aguardandoFrame = false; // throttle: só um requestAnimationFrame por vez
let ignorarProximoScroll = false; // 1º evento após trocar o alvo pode ser restauração do navegador
// Lê a posição de scroll do container ativo (window usa scrollY,
// elementos usam scrollTop)
function lerScroll() {
    return containerAtual === window ? window.scrollY : containerAtual.scrollTop;
}

// Listener passivo: apenas agenda o cálculo para o próximo frame
function aoRolar() {
    if (aguardandoFrame) return;
    aguardandoFrame = true;
    requestAnimationFrame(atualizarHeader);
}

function atualizarHeader() {
    aguardandoFrame = false;

    if (ignorarProximoScroll) {
        ignorarProximoScroll = false;
        ultimoY = lerScroll();
        return;
    }

    // Drawer aberto: header sempre visível
    if (document.body.classList.contains('drawer-aberto')) {
        header.classList.remove('header--oculto');
        ultimoY = lerScroll();
        return;
    }

    const y = lerScroll();

    // No topo (ou quase), o header fica sempre visível
    if (y <= LIMIAR) {
        header.classList.remove('header--oculto');
        ultimoY = y;
        return;
    }

    const delta = y - ultimoY;

    // Micro-scroll: não reage e nem atualiza a referência
    if (Math.abs(delta) < LIMIAR) return;

    // Rolando para baixo esconde; para cima reaparece
    header.classList.toggle('header--oculto', delta > 0);
    ultimoY = y;
}

// Troca o container de scroll observado. Usado pelos overlays de
// case (que têm scroll próprio): observarScroll(overlay) ao abrir
// e observarScroll() ao fechar para voltar ao scroll da página
export function observarScroll(container) {
    containerAtual.removeEventListener('scroll', aoRolar);
    containerAtual = container || window;
    containerAtual.addEventListener('scroll', aoRolar, { passive: true });
    ultimoY = lerScroll();
    ignorarProximoScroll = true;
    header.classList.remove('header--oculto');
}

// Abre/fecha o drawer lateral e sincroniza o aria-expanded
function alternarDrawer(botao, forcarFechar) {
    const abrir = forcarFechar ? false : !document.body.classList.contains('drawer-aberto');
    document.body.classList.toggle('drawer-aberto', abrir);
    botao.setAttribute('aria-expanded', String(abrir));
    botao.setAttribute('aria-label', window.i18n.t(abrir ? 'header.fechar-menu' : 'header.abrir-menu'));
    // Com o drawer aberto o header não pode estar escondido
    if (abrir) header.classList.remove('header--oculto');
}

export function initHeader() {
    header = document.querySelector('header');
    if (!header) {
        console.error('Header: elemento <header> não encontrado. Navegação desativada.');
        return;
    }

    // Auto-hide: começa escutando o scroll da página
    observarScroll(window);

    // Drawer
    const botaoMenu = header.querySelector('.botao-menu');
    const drawer = document.getElementById('drawer-menu');
    if (botaoMenu && drawer) {
        botaoMenu.addEventListener('click', () => alternarDrawer(botaoMenu));
        // Clicar em um link do menu navega via router e fecha o
        // drawer. O salto de âncora nativo é prevenido; sem JS os
        // hrefs continuam funcionando como âncoras normais
        drawer.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const id = (link.getAttribute('href') || '').replace('#', '');
            if (id && window.router) {
                e.preventDefault();
                window.router.navegarPara(id);
            }
            alternarDrawer(botaoMenu, true);
        });
        // Esc também fecha
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') alternarDrawer(botaoMenu, true);
        });
    }

    // Qualquer clique na tela fecha o drawer.
    // O botão é ignorado porque ele já faz o toggle sozinho.
    document.addEventListener('click', (e) => {
        if (!document.body.classList.contains('drawer-aberto')) return;
        if (e.target.closest('.botao-menu')) return;
        if (e.target.closest('#drawer-menu')) return;
        alternarDrawer(botaoMenu, true);
    });
    // API global para os overlays de case (que têm scroll próprio)
    // redirecionarem o auto-hide sem importar o módulo
    window.autoHideHeader = { observar: observarScroll };
}
