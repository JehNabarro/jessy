// i18n.js — internacionalizacao em vanilla, no mesmo espirito do projeto
//
// Modelo:
// - Dicionario unico com "pt" e "en", chaves em notacao pontuada
// - Elementos estaticos e de <template> usam data-i18n="chave"
//   para trocar o textContent
// - Atributos (aria-label, placeholder, alt, title) usam
//   data-i18n-attr="aria-label:chave; placeholder:outra.chave"
// - O idioma fica salvo em localStorage e reflete em <html lang>
// - IMPORTANTE: como o router CLONA o template a cada navegacao,
//   chame window.i18n.aplicar() depois de inserir a secao nova

const DICIONARIO = {
  pt: {
    'geral.locale': 'pt-BR',
    'home.titulo': 'Simplificar o complicado!',
    'home.subtitulo': 'Design e Web para negocios em crescimento.',
    'marca.texto-circular': 'UX / UI DESIGN • JESSICA NABARRO • PRODUCT DESIGN • WEB DESIGN • VIBE CODING •',
    'header.voltar': 'Voltar ao inicio',
    'header.abrir-menu': 'Abrir menu',
    'header.fechar-menu': 'Fechar menu',
    'nav.home': 'Home',
    'nav.projetos': 'Projetos',
    'nav.coinple': 'Coinple',
    'nav.momentos': 'Momentos',
    'nav.diagnostico': 'Diagnostico de Lideranca',
    'nav.motorline': 'Motorline',
    'nav.sobre': 'Quem sou eu',
    'nav.contato': 'Contato',
    'chat.pergunta-placeholder': 'Faca uma pergunta...',
    'chat.enviar': 'Enviar pergunta',
    'chat.minimizar': 'Minimizar chat',
    'chat.abrir': 'Abrir chat',
    // titulos da aba do navegador, usados pelo router
    'titulo.home': 'Portfolio — Jessica Nabarro',
    'titulo.projetos': 'Projetos — Jessica Nabarro',
    'titulo.coinple': 'Coinple — Jessica Nabarro',
    'titulo.momentos': 'Momentos — Jessica Nabarro',
    'titulo.diagnostico': 'Diagnostico de Lideranca — Jessica Nabarro',
    'titulo.motorline': 'Motorline — Jessica Nabarro',
    'titulo.sobre': 'Quem sou eu — Jessica Nabarro',
    'titulo.contato': 'Contato — Jessica Nabarro'
  },
  en: {
    'geral.locale': 'en-US',
    'home.titulo': 'Simplify the complicated!',
    'home.subtitulo': 'Design and Web for growing businesses.',
    'marca.texto-circular': 'UX / UI DESIGN • JESSICA NABARRO • PRODUCT DESIGN • WEB DESIGN • VIBE CODING •',
    'header.voltar': 'Back to top',
    'header.abrir-menu': 'Open menu',
    'header.fechar-menu': 'Close menu',
    'nav.home': 'Home',
    'nav.projetos': 'Work',
    'nav.coinple': 'Coinple',
    'nav.momentos': 'Momentos',
    'nav.diagnostico': 'Leadership Diagnostic',
    'nav.motorline': 'Motorline',
    'nav.sobre': 'About me',
    'nav.contato': 'Contact',
    'chat.pergunta-placeholder': 'Ask a question...',
    'chat.enviar': 'Send question',
    'chat.minimizar': 'Minimize chat',
    'chat.abrir': 'Open chat',
    'titulo.home': 'Portfolio — Jessica Nabarro',
    'titulo.projetos': 'Work — Jessica Nabarro',
    'titulo.coinple': 'Coinple — Jessica Nabarro',
    'titulo.momentos': 'Momentos — Jessica Nabarro',
    'titulo.diagnostico': 'Leadership Diagnostic — Jessica Nabarro',
    'titulo.motorline': 'Motorline — Jessica Nabarro',
    'titulo.sobre': 'About me — Jessica Nabarro',
    'titulo.contato': 'Contact — Jessica Nabarro'
  }
};

const IDIOMAS = ['pt', 'en'];
const CHAVE_STORAGE = 'jessy-idioma';

// Idioma inicial: escolha salva > idioma do navegador > pt
function idiomaInicial() {
  const salvo = localStorage.getItem(CHAVE_STORAGE);
  if (salvo && IDIOMAS.includes(salvo)) return salvo;
  const nav = (navigator.language || 'pt').slice(0, 2).toLowerCase();
  return IDIOMAS.includes(nav) ? nav : 'pt';
}

let idiomaAtual = idiomaInicial();

// Traducao de uma chave no idioma corrente (fallback: pt e depois a propria chave)
function t(chave) {
  const dic = DICIONARIO[idiomaAtual] || {};
  if (chave in dic) return dic[chave];
  if (chave in DICIONARIO.pt) return DICIONARIO.pt[chave];
  return chave;
}

// Aplica o idioma a uma raiz (document por padrao, ou uma secao recem-clonada)
function aplicar(raiz = document) {
  // textContent
  raiz.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  // atributos: "aria-label:chave; placeholder:outra"
  raiz.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.getAttribute('data-i18n-attr').split(';').forEach((par) => {
      const [attr, chave] = par.split(':').map((s) => s.trim());
      if (attr && chave) el.setAttribute(attr, t(chave));
    });
  });
  // blocos de conteudo longo por idioma: mostra so o do idioma ativo
  raiz.querySelectorAll('[data-lang]').forEach((el) => {
    el.hidden = el.getAttribute('data-lang') !== idiomaAtual;
  });
  // sincroniza o toggle de idioma: marcado = 'en', desmarcado = 'pt'
  raiz.querySelectorAll('[data-idioma-toggle]').forEach((el) => {
    el.checked = idiomaAtual === 'en';
  });
  // reflete no <html lang> apenas quando aplicamos no documento inteiro
  if (raiz === document) {
    document.documentElement.lang = t('geral.locale');
  }
}

// Troca de idioma e reaplica em todo o documento
function definirIdioma(novo) {
  if (!IDIOMAS.includes(novo) || novo === idiomaAtual) return;
  idiomaAtual = novo;
  localStorage.setItem(CHAVE_STORAGE, novo);
  aplicar(document);
  // avisa quem precisa reagir (router para o document.title, chat para o script)
  document.dispatchEvent(new CustomEvent('idioma:mudou', { detail: { idioma: novo } }));
}

function alternar() {
  definirIdioma(idiomaAtual === 'pt' ? 'en' : 'pt');
}

// API global, no mesmo padrao de window.router e window.i18n
window.i18n = {
  t,
  aplicar,
  alternar,
  definirIdioma,
  get idioma() { return idiomaAtual; }
};

// Primeira aplicacao no load
aplicar(document);
