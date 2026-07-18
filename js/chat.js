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
const script = {
    inicio: {
        rotulo: 'Início',
        resposta: 'Oi! Eu sou a Jessy, assistente virtual da Jéssica. Pergunte sobre os projetos, sobre ela ou como entrar em contato.'
    },
    projetos: {
        rotulo: 'Projetos',
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
};

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
let trilha = [];          // caminho de pão: [{ no, rotulo }]

// Referências de DOM internas
let elTrilha, elCorpo, elDigitando, elResposta, elChips, elForm, elInput;

// ------------------------------------------------------------
// Construção do DOM interno
// ------------------------------------------------------------
function construirDom() {
    raiz.classList.add('chat', 'glass', 'chat--expanded');
    raiz.innerHTML = `
    <button class="chat-minimizar" type="button" aria-label="Minimizar chat">&minus;</button>
    <div class="chat-trilha" role="list" aria-label="Perguntas feitas"></div>
    <div class="chat-corpo">
      <div class="chat-digitando" hidden aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <p class="chat-resposta" aria-live="polite"></p>
    </div>
    <div class="chat-chips" aria-label="Sugestões"></div>
    <form class="chat-form">
      <input type="text" placeholder="Faça uma pergunta..." aria-label="Faça uma pergunta" autocomplete="off" />
      <button class="chat-enviar" type="submit" aria-label="Enviar pergunta">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
      </button>
    </form>
    <button class="chat-fab-icone" type="button" aria-label="Abrir chat">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
    </button>
  `;

    elTrilha = raiz.querySelector('.chat-trilha');
    elCorpo = raiz.querySelector('.chat-corpo');
    elDigitando = raiz.querySelector('.chat-digitando');
    elResposta = raiz.querySelector('.chat-resposta');
    elChips = raiz.querySelector('.chat-chips');
    elForm = raiz.querySelector('.chat-form');
    elInput = elForm.querySelector('input');

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
            perguntar(alvo.no, script[alvo.no].rotulo);
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
        chip.textContent = script[no].rotulo;
        chip.addEventListener('click', () => perguntar(no, script[no].rotulo));
        elChips.appendChild(chip);
    }
}

// Nó com página associada: pede ao router para navegar até ela
function navegarSeTiverPagina(no) {
    if (script[no].pagina && window.router) {
        window.router.navegarPara(script[no].pagina);
    }
}

// ------------------------------------------------------------
// Trilha (caminho de pão)
// ------------------------------------------------------------
function renderizarTrilha() {
    elTrilha.innerHTML = '';
    trilha.forEach((item, indice) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.setAttribute('role', 'listitem');
        chip.textContent = item.rotulo;
        chip.addEventListener('click', () => voltarPara(indice));
        elTrilha.appendChild(chip);
    });
}

// Clicar em um chip da trilha: reexibe a resposta daquele nó e
// remove os chips posteriores a ele
function voltarPara(indice) {
    trilha = trilha.slice(0, indice + 1);
    renderizarTrilha();
    const no = trilha[indice].no;
    // Reexibição rápida (sem indicador "digitando")
    gsap.fromTo(elResposta, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    elResposta.textContent = script[no].resposta;
    renderizarChips(script[no].sugestoes || sugestoesPadrao);
    // Voltar para um nó de página também renavega até ela
    navegarSeTiverPagina(no);
}

// ------------------------------------------------------------
// Nova pergunta: resposta anterior sai, "digitando" aparece,
// nova resposta entra; a pergunta vira chip no fim da trilha
// ------------------------------------------------------------
function perguntar(no, rotulo) {
    trilha.push({ no, rotulo });
    renderizarTrilha();

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
        elResposta.textContent = script[no].resposta;
        renderizarChips(script[no].sugestoes || sugestoesPadrao);
    });
    tl.fromTo(elResposta, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
}

// ------------------------------------------------------------
// Troca de estado com GSAP FLIP (a trilha persiste em memória)
// ------------------------------------------------------------
export function definirEstado(novo) {
    if (!raiz || novo === estado) return;

    const Flip = window.Flip;
    const flipState = Flip.getState(raiz);

    // No estado expandido o chat vive dentro do slot da home;
    // em bar/fab ele vai para o <body> (position: fixed confiável,
    // sem depender de ancestrais com transform)
    if (novo === 'expanded' && slotHome) {
        slotHome.appendChild(raiz);
    } else if (novo !== 'expanded' && raiz.parentElement !== document.body) {
        document.body.appendChild(raiz);
    }

    raiz.classList.remove('chat--expanded', 'chat--bar', 'chat--fab');
    raiz.classList.add(`chat--${novo}`);

    estadoAnterior = estado;
    estado = novo;

    Flip.from(flipState, {
        duration: 0.55,
        ease: 'power2.inOut',
        absolute: true,
        // Limpa o transform inline do FLIP para devolver o
        // translateZ(0) definido em .glass
        onComplete: () => gsap.set(raiz, { clearProps: 'transform' })
    });
}

// ------------------------------------------------------------
// Reancora o chat em um novo slot da home. Necessário porque o
// router remove a section da home do DOM ao sair dela e clona uma
// nova ao voltar — a referência antiga do slot morre junto
// ------------------------------------------------------------
export function definirSlotHome(slot) {
    slotHome = slot || null;
    if (slotHome && raiz && estado === 'expanded' && raiz.parentElement !== slotHome) {
        slotHome.appendChild(raiz);
    }
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
    if (!window.gsap || !window.Flip) {
        console.error('Chat Jessy: GSAP/Flip não carregados (CDN). Chat desativado.');
        return;
    }
    gsap.registerPlugin(window.Flip);

    construirDom();

    // Estado inicial: expandido dentro da home, com a saudação
    if (slotHome) slotHome.appendChild(raiz);
    elResposta.textContent = script.inicio.resposta;

    // API global para outras telas trocarem o estado sem importar
    // o módulo (ex.: overlays de case colocam o chat em fab)
    window.jessyChat = { definirEstado, perguntar, definirSlotHome };
}
