// preloader.js — tela splash de entrada
//
// Regras de robustez:
// - Força display:flex como primeira instrução (o HTML entrega display:none)
// - Verifica a existência de cada elemento e loga qual seletor falhou
// - Nenhuma cor fixa em string: tudo vem dos tokens em tokens.css
// - Saída só quando: sequência completa + window load + tempo mínimo
// - prefers-reduced-motion: pula as animações e remove o preloader no load
// - will-change aplicado só durante cada animação e removido no onfinish
// - Sem setTimeout: o encadeamento usa onfinish (Web Animations API)

(function () {
    const preloader = document.getElementById('preloader');
    if (!preloader) {
        console.error('Preloader: o seletor "#preloader" não encontrou nenhum elemento no HTML. Splash desativado.');
        document.body.classList.add('loaded');
        return;
    }

    // Primeira instrução: torna o preloader visível antes de
    // qualquer passo que possa falhar
    preloader.style.display = 'flex';

    const glass = preloader.querySelector('.glass');
    const marca = glass && glass.querySelector('svg');
    const textoCircular = preloader.querySelector('.texto-circular');
    const texto = textoCircular && textoCircular.querySelector('text');
    const wrapper = preloader.querySelector('.circulo-wrapper');

    const faltando = [];
    if (!glass) faltando.push('#preloader .glass');
    if (!marca) faltando.push('#preloader .glass svg');
    if (!textoCircular) faltando.push('#preloader .texto-circular');
    if (!texto) faltando.push('#preloader .texto-circular text');
    if (!wrapper) faltando.push('#preloader .circulo-wrapper');

    // Remove o splash quando a página terminar de carregar E a
    // grade de fundo já tiver feito o primeiro desenho — o site
    // nunca abre sem a grade pronta (usado nos caminhos sem animação)
    function removerAoCarregar() {
        const tentar = () => {
            if (document.readyState !== 'complete') return;
            if (!window.__gradePronta) return;
            preloader.remove();
            document.body.classList.add('loaded');
        };
        window.addEventListener('load', tentar);
        window.addEventListener('grade:pronta', tentar);
        tentar();
    }

    if (faltando.length > 0) {
        console.error('Preloader: seletores sem correspondência no HTML: ' + faltando.join(', ') + '. Splash desativado.');
        removerAoCarregar();
        return;
    }

    // ---------- Tokens de design (nenhuma cor fixa em string) ----------
    const raiz = getComputedStyle(document.documentElement);
    const token = (nome) => raiz.getPropertyValue(nome).trim();
    const tokenMs = (nome, padrao) => {
        const valor = parseFloat(token(nome));
        return Number.isFinite(valor) && valor > 0 ? valor : padrao;
    };

    // Antes era currentColor sem color definido → renderizava preto.
    // Agora a cor vem do mesmo token que o CSS usa para o texto orbital.
    const corTexto = token('--cor-texto-suave') || token('--cor-texto');
    const corTransparente = token('--cor-transparente');

    // ---------- Estado inicial ----------
    glass.style.transform = 'scale(0)';
    marca.style.opacity = '0';

    // Prepara o texto para o efeito de "escrita" via traçado
    const comprimento = 760; // aproximação do perímetro da órbita (2πr, r = 120)
    texto.style.fill = corTransparente;
    texto.style.stroke = corTexto;
    texto.style.strokeWidth = '1';
    texto.style.strokeDasharray = comprimento;
    texto.style.strokeDashoffset = comprimento;

    // ---------- Portões de saída ----------
    let sequenciaPronta = false;
    let paginaCarregada = false;
    let tempoMinimoOk = false;
    let gradePronta = window.__gradePronta === true;

    window.addEventListener('load', () => {
        paginaCarregada = true;
        tentarSair();
    });

    // A grade de fundo (js/grid.js) dispara este evento após o
    // primeiro desenho no canvas
    window.addEventListener('grade:pronta', () => {
        gradePronta = true;
        tentarSair();
    });

    function tentarSair() {
        // Só sai quando: sequência terminou + página carregou +
        // tempo mínimo passou + grade desenhada
        if (!sequenciaPronta || !paginaCarregada || !tempoMinimoOk || !gradePronta) return;
        sair();
    }

    // ---------- Acessibilidade ----------
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Pula tudo para quem desativou animações
        glass.style.transform = 'scale(1)';
        marca.style.opacity = '1';
        texto.style.fill = corTexto;
        texto.style.strokeDashoffset = 0;
        removerAoCarregar();
        return;
    }

    // Cronômetro do tempo mínimo sem setTimeout: uma animação vazia
    // no timeline do documento libera o portão ao terminar
    preloader.animate([], { duration: tokenMs('--tempo-minimo-preloader', 2800) })
        .onfinish = () => {
            tempoMinimoOk = true;
            tentarSair();
        };

    // ---------- Sequência de entrada ----------

    // 1. Glass escala de 0 a 100% com bounce (overshoot)
    glass.style.willChange = 'transform';
    const animGlass = glass.animate(
        [
            { transform: 'scale(0)' },
            { transform: 'scale(1.12)', offset: 0.6 },
            { transform: 'scale(0.96)', offset: 0.8 },
            { transform: 'scale(1)' }
        ],
        {
            duration: tokenMs('--duracao-xl', 900),
            easing: token('--ease-bounce') || 'ease-out',
            fill: 'forwards'
        }
    );

    animGlass.onfinish = () => {
        glass.style.willChange = '';

        // 2. Marca surge com opacity
        marca.style.willChange = 'opacity, transform';
        const animMarca = marca.animate(
            [
                { opacity: 0, transform: 'scale(.92)' },
                { opacity: 1, transform: 'scale(1)' }
            ],
            {
                duration: tokenMs('--duracao-md', 600),
                easing: token('--ease-entrada') || 'ease-out',
                fill: 'forwards'
            }
        );

        animMarca.onfinish = () => {
            marca.style.willChange = '';

            // 3. Texto circular é "escrito" (traçado se desenha)
            const animTraco = texto.animate(
                [
                    { strokeDashoffset: comprimento },
                    { strokeDashoffset: 0 }
                ],
                {
                    duration: tokenMs('--duracao-escrita', 1400),
                    easing: token('--ease-fluido') || 'ease-in-out',
                    fill: 'forwards'
                }
            );

            // Quando o traçado termina, preenche as letras
            animTraco.onfinish = () => {
                texto.animate(
                    [
                        { fill: corTransparente },
                        { fill: corTexto }
                    ],
                    {
                        duration: tokenMs('--duracao-sm', 500),
                        easing: token('--ease-entrada') || 'ease-out',
                        fill: 'forwards'
                    }
                ).onfinish = () => {
                    texto.style.fill = corTexto;
                    sequenciaPronta = true;
                    tentarSair();
                };
            };
        };
    };

    // ---------- Saída ----------
    function sair() {
        // Zoom-out + fade do wrapper, depois o preloader sobe como cortina
        wrapper.style.willChange = 'transform, opacity';
        wrapper.animate(
            [
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: 'translate(-50%, -50%) scale(.85)', opacity: 0 }
            ],
            {
                duration: tokenMs('--duracao-xs', 450),
                easing: token('--ease-saida') || 'ease-in',
                fill: 'forwards'
            }
        ).onfinish = () => {
            wrapper.style.willChange = '';
            preloader.style.willChange = 'transform';
            preloader.animate(
                [
                    { transform: 'translateY(0)' },
                    { transform: 'translateY(-100%)' }
                ],
                {
                    duration: tokenMs('--duracao-lg', 800),
                    easing: token('--ease-cortina') || 'ease-in-out',
                    fill: 'forwards'
                }
            ).onfinish = () => {
                preloader.remove(); // libera memória (e o will-change junto)
                document.body.classList.add('loaded'); // dispara entrada da home
            };
        };
    }
})();
