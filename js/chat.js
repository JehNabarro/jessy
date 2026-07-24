// chat.js — Chat Jessy: componente único com 3 estados
//
// Estados (trocados por classe, transição animada com GSAP FLIP):
// - chat--expanded: caixa aberta, padrão da home (dentro do #chat-slot)
// - chat--bar: linha única fixa na base da tela
// - chat--fab: botão flutuante no canto inferior direito (modo leitura)
//
// Modelo de navegação (não é um chat com histórico):
// - Exibe apenas a resposta ATUAL da Jessy e, acima dela, a trilha
//   das perguntas já feitas (caminho de pão)
// - Cada pergunta vira um chip na trilha; clicar em um chip volta
//   para aquele nó e remove os chips posteriores
// - A trilha persiste em memória ao trocar de estado
//
// Dependências globais: gsap e Flip (carregados via CDN no index.html)

// ------------------------------------------------------------
// Roteiro da Jessy: cada nó tem um rótulo (chip) e uma resposta.
// Nós com a propriedade "pagina" também navegam (via router) para
// a página correspondente ao responder. "sugestoes" troca os chips
// oferecidos após a resposta (padrão: sugestoesPadrao)
// ------------------------------------------------------------
const scripts = {
    pt: {
        inicio: {
            rotulo: 'Início',
            resposta: 'Olá! Eu sou a assistente da Jéssica Nabarro. Deseja começar por onde?',
            sugestoes: ['projetos', 'sobre', 'contato', 'coinple']
        },
        projetos: {
            rotulo: 'Projetos',
            pagina: 'projetos',
            resposta: 'A Jéssica tem 4 cases de UX/UI e Web: Coinple, Momentos, Diagnóstico de Liderança e Motorline. Escolha um abaixo para abrir!',
            sugestoes: ['coinple', 'momentos', 'diagnostico', 'motorline']
        },
        coinple: {
            rotulo: 'Coinple',
            pagina: 'coinple',
            resposta: 'Boa escolha! Abrindo o case do Coinple para você.'
        },
        momentos: {
            rotulo: 'Momentos',
            pagina: 'momentos',
            resposta: 'Boa escolha! Abrindo o case do Momentos para você.'
        },
        diagnostico: {
            rotulo: 'Diagnóstico de Liderança',
            pagina: 'diagnostico',
            resposta: 'Boa escolha! Abrindo o case do Diagnóstico de Liderança para você.'
        },
        motorline: {
            rotulo: 'Motorline',
            pagina: 'motorline',
            resposta: 'Boa escolha! Abrindo o case da Motorline para você.'
        },
        sobre: {
            rotulo: 'Quem é a Jéssica?',
            pagina: 'sobre',
            resposta: 'A Jéssica Nabarro é designer de produto e web. Ela simplifica o complicado: transforma processos confusos em interfaces claras para negócios em crescimento. Abrindo a página dela para você.'
        },
        contato: {
            rotulo: 'Contato',
            pagina: 'contato',
            resposta: 'Você pode falar com a Jéssica pelo e-mail jeh.nabarro@gmail.com ou pelo LinkedIn. Abrindo a página de contato para você.'
        },
        linkedin: {
            rotulo: 'LinkedIn',
            resposta: 'Procure por Jéssica Nabarro no LinkedIn. É lá que ela publica projetos e novidades.'
        },
        desconhecido: {
            rotulo: 'Outra pergunta',
            resposta: 'Hmm, essa eu ainda não sei responder. Tente uma das sugestões abaixo!'
        }
    },
    en: {
        inicio: {
            rotulo: 'Start',
            resposta: 'Hi! I am Jéssica Nabarro\'s assistant. Where would you like to begin?',
            sugestoes: ['projetos', 'sobre', 'contato', 'coinple']
        },
        projetos: {
            rotulo: 'Work',
            pagina: 'projetos',
            resposta: 'Jéssica has 4 UX/UI and Web cases: Coinple, Momentos, Leadership Diagnostic and Motorline. Pick one below to open it!',
            sugestoes: ['coinple', 'momentos', 'diagnostico', 'motorline']
        },
        coinple: {
            rotulo: 'Coinple',
            pagina: 'coinple',
            resposta: 'EN - Boa escolha! Abrindo o case do Coinple para você.'
        },
        momentos: {
            rotulo: 'Momentos',
            pagina: 'momentos',
            resposta: 'EN - Boa escolha! Abrindo o case do Momentos para você.'
        },
        diagnostico: {
            rotulo: 'Diagnóstico de Liderança',
            pagina: 'diagnostico',
            resposta: 'EN - Boa escolha! Abrindo o case do Diagnóstico de Liderança para você.'
        },
        motorline: {
            rotulo: 'Motorline',
            pagina: 'motorline',
            resposta: 'EN - Boa escolha! Abrindo o case da Motorline para você.'
        },
        sobre: {
            rotulo: 'Quem é a Jéssica?',
            pagina: 'sobre',
            resposta: 'EN - A Jéssica Nabarro é designer de produto e web. Ela simplifica o complicado: transforma processos confusos em interfaces claras para negócios em crescimento. Abrindo a página dela para você.'
        },
        contato: {
            rotulo: 'Contato',
            pagina: 'contato',
            resposta: 'EN - Você pode falar com a Jéssica pelo e-mail jeh.nabarro@gmail.com ou pelo LinkedIn. Abrindo a página de contato para você.'
        },
        linkedin: {
            rotulo: 'LinkedIn',
            resposta: 'EN - Procure por Jéssica Nabarro no LinkedIn. É lá que ela publica projetos e novidades.'
        },
        desconhecido: {
            rotulo: 'Outra pergunta',
            resposta: 'EN - Hmm, essa eu ainda não sei responder. Tente uma das sugestões abaixo!'
        }
    }
};

// devolve o roteiro do idioma ativo (fallback: pt)
function roteiro() { return scripts[window.i18n.idioma] || scripts.pt; }

// Nós oferecidos como chips de sugestão por padrão
const sugestoesPadrao = ['projetos', 'sobre', 'contato'];

// Mapeamento de palavras-chave da digitação livre para os nós
// (os projetos vêm antes do genérico /projet/; acentos opcionais)
const palavrasChave = [
    { regex: /coinple/i, no: 'coinple' },
    { regex: /momentos?/i, no: 'momentos' },
    { regex: /diagn[oó]stic|lideran[cç]a/i, no: 'diagnostico' },
    { regex: /motor\s*line/i, no: 'motorline' },
    { regex: /projet/i, no: 'projetos' },
    { regex: /linkedin/i, no: 'linkedin' },
    { regex: /sobre|j[eé]ssica|quem/i, no: 'sobre' },
    { regex: /contat|e-?mail|falar|whats/i, no: 'contato' }
];

// ------------------------------------------------------------
// Estado do componente (persiste em memória entre estados/telas)
// ------------------------------------------------------------
let raiz = null;          // o elemento #chat-jessy-ia
let slotHome = null;      // #chat-slot dentro da home (estado expanded)
let estado = 'expanded';  // estado visual atual
let estadoAnterior = 'expanded'; // para onde o fab volta ao expandir 

// Referências de DOM internas
let elCorpo, elDigitando, elResposta, elChips, elForm, elInput;
let elCaminho, elCaminhoTexto, elReticencias;
let caminho = [];        // histórico de navegação: só cresce
let contexto = 'home';

// ------------------------------------------------------------
// Construção do DOM interno
// ------------------------------------------------------------
function construirDom() {
    raiz.classList.add('chat', 'glass', 'chat--expanded', 'chat--na-home');
    raiz.innerHTML = `
    <button class="chat-minimizar" type="button" data-i18n-attr="aria-label:chat.minimizar">&minus;</button>
    <div class="chat-corpo">
      <div class="chat-digitando" hidden aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <p class="chat-resposta" aria-live="polite"></p>
    </div>
    <div class="chat-chips" aria-label="Sugestões"></div>
    <form class="chat-form">
        <input type="text" autocomplete="off" data-i18n-attr="placeholder:chat.pergunta-placeholder; aria-label:chat.pergunta-placeholder" />
      <button class="chat-enviar" type="submit" data-i18n-attr="aria-label:chat.enviar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
      </button>
    </form>
    <nav class="chat-caminho" aria-label="Caminho de navegação">
      <span class="caminho-reticencias" hidden>…</span>
      <span class="caminho-texto"></span>
    </nav>
    <button class="chat-fab-icone" type="button" data-i18n-attr="aria-label:chat.abrir">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
    </button>
  `;

    elCorpo = raiz.querySelector('.chat-corpo');
    elDigitando = raiz.querySelector('.chat-digitando');
    elResposta = raiz.querySelector('.chat-resposta');
    elChips = raiz.querySelector('.chat-chips');
    elForm = raiz.querySelector('.chat-form');
    elInput = elForm.querySelector('input');
    elCaminho = raiz.querySelector('.chat-caminho');
    elCaminhoTexto = raiz.querySelector('.caminho-texto');
    elReticencias = raiz.querySelector('.caminho-reticencias');

    // Chips de sugestão iniciais
    renderizarChips(sugestoesPadrao);

    // Digitação livre com mapeamento de palavras-chave
    elForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = elInput.value.trim();
        if (!texto) return;
        elInput.value = '';
        const alvo = palavrasChave.find((p) => p.regex.test(texto));
        if (alvo) {
            perguntar(alvo.no, roteiro()[alvo.no].rotulo);
        } else {
            // Sem correspondência: a Jessy oferece as sugestões e o
            // texto digitado vira o rótulo do chip na trilha
            perguntar('desconhecido', texto);
        }
    });

    // Minimizar (expanded) leva ao fab (modo leitura)
    raiz.querySelector('.chat-minimizar').addEventListener('click', () => definirEstado('fab'));

    // Clicar no fab expande de volta para o estado anterior
    raiz.querySelector('.chat-fab-icone').addEventListener('click', () => {
        definirEstado(estadoAnterior === 'fab' ? 'expanded' : estadoAnterior);
    });

    window.i18n.aplicar(raiz);
}

// ------------------------------------------------------------
// Chips de sugestão (mudam conforme o nó respondido; ex.: o nó
// "projetos" oferece os 4 projetos como chips)
// ------------------------------------------------------------
function renderizarChips(nos) {
    elChips.innerHTML = '';
    for (const no of nos) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = roteiro()[no].rotulo;
        chip.addEventListener('click', () => perguntar(no, roteiro()[no].rotulo));
        elChips.appendChild(chip);
    }
}

// Nó com página associada: pede ao router para navegar até ela
function navegarSeTiverPagina(no) {
    if (roteiro()[no].pagina && window.router) {
        window.router.navegarPara(roteiro()[no].pagina);
    }
}


// ------------------------------------------------------------
// Nova pergunta: resposta anterior sai, "digitando" aparece,
// nova resposta entra; a pergunta vira chip no fim da trilha
// ------------------------------------------------------------
function perguntar(no, rotulo) {

    // A navegação dispara junto com a resposta: a hero sai e o chat
    // vai para a barra enquanto a Jessy "digita"
    navegarSeTiverPagina(no);

    const tl = gsap.timeline();

    // 1. Resposta anterior sai com fade/slide
    tl.to(elResposta, { opacity: 0, y: -8, duration: 0.25, ease: 'power2.in' });

    // 2. Indicador "digitando"
    tl.call(() => {
        elResposta.textContent = '';
        elDigitando.hidden = false;
    });
    tl.to({}, { duration: 0.9 }); // a Jessy "pensa" um instante

    // 3. Nova resposta entra (e os chips do nó, se ele definir)
    tl.call(() => {
        elDigitando.hidden = true;
        elResposta.textContent = roteiro()[no].resposta;
        renderizarChips(roteiro()[no].sugestoes || sugestoesPadrao);
    });
    tl.fromTo(elResposta, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
}

// ------------------------------------------------------------
// Troca de estado com efeito "bolha" (a trilha persiste em memória):
// o chat encolhe e some no formato atual, troca de pai e de classe
// invisível, e nasce crescendo no formato novo com overshoot
// (--ease-bounce). Sem morph entre formatos: sem saltos.
// ------------------------------------------------------------

// ------------------------------------------------------------
// Tokens de movimento, lidos uma vez do CSS
// ------------------------------------------------------------
const estiloRaiz = getComputedStyle(document.documentElement);
const tokenChat = (nome) => estiloRaiz.getPropertyValue(nome).trim();
const reducaoMov = window.matchMedia('(prefers-reduced-motion: reduce)');

// ------------------------------------------------------------
// Posicionamento: o chat nunca troca de pai, só de coordenadas
// ------------------------------------------------------------

// Cola o chat por cima do #chat-slot da home (sem animação)
function posicionarNoSlot() {
    if (!slotHome || contexto !== 'home') return;
    const r = slotHome.getBoundingClientRect();
    gsap.set(raiz, { left: r.left, top: r.top, width: r.width, right: 'auto', bottom: 'auto' });
}
window.addEventListener('resize', posicionarNoSlot);

// Desliza o chat até um retângulo-alvo e, ao chegar, entrega a
// ancoragem para o CSS (classe), limpando o estilo inline
// Desliza o chat até um retângulo-alvo. Nas internas entrega a
// ancoragem para o CSS (classe) e limpa o inline; na home mantém
// o chat preso ao slot pelos estilos inline.
function deslizarPara(alvo, classeFinal) {
    gsap.to(raiz, {
        left: alvo.left,
        top: alvo.top,
        width: alvo.width,
        duration: 0.55,
        ease: 'power2.inOut',
        onComplete: () => {
            if (classeFinal) {
                // Interna: .chat--flutuante ancora via CSS, o inline pode sair
                raiz.classList.add(classeFinal);
                gsap.set(raiz, { clearProps: 'left,top,width,right,bottom' });
            } else {
                // Home: sem âncora no CSS, reancora no slot
                posicionarNoSlot();
            }
        }
    });
}

// Retângulo da posição flutuante (canto inferior direito)
function retanguloFlutuante() {
    const margem = parseFloat(tokenChat('--esp-md')) || 16;
    const largura = Math.min(
        parseFloat(tokenChat('--largura-chat')) || 480,
        window.innerWidth - margem * 2
    );
    return {
        left: window.innerWidth - largura - margem,
        top: window.innerHeight - raiz.offsetHeight - margem,
        width: largura
    };
}

// ------------------------------------------------------------
// Contexto: home (chat aberto no slot, sem minimizar) ou
// interna (chat flutuante, colapsa em fab ao rolar)
// ------------------------------------------------------------
export function definirContexto(novo) {
    if (contexto === novo) return;
    contexto = novo;
    raiz.classList.toggle('chat--na-home', novo === 'home');

    if (novo === 'interna') {
        // Sai da home deslizando do slot até o canto inferior
        if (estado !== 'expanded') definirEstado('expanded', true);
        if (reducaoMov.matches) {
            raiz.classList.add('chat--flutuante');
            gsap.set(raiz, { clearProps: 'left,top,width,right,bottom' });
        } else {
            deslizarPara(retanguloFlutuante(), 'chat--flutuante');
        }
    } else {
        // Volta para a home deslizando do canto de volta ao slot.
        // Congela a posição atual (o canto, ancorado pelo CSS) em
        // estilos inline ANTES de tirar a classe, senão o chat salta
        // para a posição automática do body e o slide parte do lugar errado
        if (!reducaoMov.matches && slotHome) {
            const atual = raiz.getBoundingClientRect();
            gsap.set(raiz, {
                left: atual.left,
                top: atual.top,
                width: atual.width,
                right: 'auto',
                bottom: 'auto'
            });
        }
        raiz.classList.remove('chat--flutuante');
        if (estado !== 'expanded') definirEstado('expanded', true);

        if (reducaoMov.matches || !slotHome) {
            posicionarNoSlot();
        } else {
            const r = slotHome.getBoundingClientRect();
            deslizarPara({ left: r.left, top: r.top, width: r.width });
        }
    }
}

// ------------------------------------------------------------
// Estados expanded/fab com efeito bolha: some encolhendo num
// canto, nasce crescendo no outro (sem morph entre formatos)
// ------------------------------------------------------------
export function definirEstado(novo, seco) {
    if (!raiz || novo === estado) return;
    estado = novo;

    const trocar = () => {
        raiz.classList.remove('chat--expanded', 'chat--fab');
        raiz.classList.add(`chat--${novo}`);
        // fab e expanded-flutuante ancoram pelo CSS; na home o
        // expanded é reposicionado no slot
        gsap.set(raiz, { clearProps: 'left,top,width,right,bottom' });
        if (novo === 'expanded' && contexto === 'home') posicionarNoSlot();
    };

    if (seco || reducaoMov.matches) {
        trocar();
        gsap.set(raiz, { clearProps: 'transform,opacity' });
        return;
    }

    gsap.timeline()
        .to(raiz, {
            scale: 0.85,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            transformOrigin: 'center center'
        })
        .call(trocar)
        .fromTo(raiz,
            { scale: 0.85, opacity: 0 },
            {
                scale: 1,
                opacity: 1,
                duration: 0.45,
                ease: 'back.out(1.4)',
                transformOrigin: 'center center',
                clearProps: 'transform,opacity'
            }
        );
}

// ------------------------------------------------------------
// Nas internas, rolar a página colapsa o chat em fab; ele só
// reabre pelo clique no fab. Limiar ignora micro-scrolls
// ------------------------------------------------------------
let scrollBase = 0;
window.addEventListener('scroll', () => {
    if (contexto !== 'interna' || estado !== 'expanded') {
        scrollBase = window.scrollY;
        return;
    }
    if (Math.abs(window.scrollY - scrollBase) > 40) definirEstado('fab');
}, { passive: true });

// ------------------------------------------------------------
// Breadcrumb: registro de TODA navegação (só cresce, nunca corta).
// O fim (página atual) fica sempre visível; o "…" aparece no
// início quando o texto estoura a largura
// ------------------------------------------------------------
export function registrarNavegacao(rotulo) {
    caminho.push(rotulo);
    elCaminhoTexto.textContent = caminho.join(' > ');
    requestAnimationFrame(() => {
        elReticencias.hidden = elCaminhoTexto.scrollWidth <= elCaminhoTexto.clientWidth;
        elCaminhoTexto.scrollLeft = elCaminhoTexto.scrollWidth;
    });
}

// ------------------------------------------------------------
// Reancora a REFERÊNCIA do slot (o router clona a home a cada
// volta): o chat não muda de pai, só de posição
// ------------------------------------------------------------
export function definirSlotHome(slot) {
    slotHome = slot || null;
    posicionarNoSlot();
}
// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------
export function initChat(elemento, slot) {
    raiz = elemento;
    slotHome = slot || null;

    if (!raiz) {
        console.error('Chat Jessy: o seletor "#chat-jessy-ia" não encontrou nenhum elemento. Chat desativado.');
        return;
    }
    if (!window.gsap) {
        console.error('Chat Jessy: GSAP não carregado (CDN). Chat desativado.');
        return;
    }

    construirDom();

    // O chat vive no body em todos os estados (fixed); na home é
    // posicionado por cima do #chat-slot
    document.body.appendChild(raiz);
    posicionarNoSlot();
    elResposta.textContent = roteiro().inicio.resposta;

    window.jessyChat = { definirEstado, definirContexto, perguntar, registrarNavegacao, definirSlotHome };
}
