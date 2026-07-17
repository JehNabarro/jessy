/* ============================================================
   Malha (grid) interativa de fundo — Canvas 2D, vanilla JS
   ------------------------------------------------------------
   - Grade virtual de pontos nas interseções das linhas (64px)
   - Clique/toque segurado abre a célula sob o cursor (64 → 128px)
   - Vizinhos acomodam a abertura com falloff curto (~128px)
   - Ao soltar, os pontos retornam com animação de mola
   - Loop de render pausa totalmente quando tudo está em repouso
   ============================================================ */

(function () {
  'use strict';

  // ---------------------------------------------------------
  // Constantes de configuração
  // ---------------------------------------------------------
  var SPACING = 64;               // espaçamento fixo entre linhas (px)
  // Cores lidas dos design tokens (css/tokens.css) — fonte única
  var tokens = getComputedStyle(document.documentElement);
  var LINE_COLOR = tokens.getPropertyValue('--cor-linha-grade').trim();
  var LINE_WIDTH = 0.3;           // espessura visual das linhas (px)
  var BG_COLOR = tokens.getPropertyValue('--cor-fundo').trim();

  var MAX_DISP = 64;              // deslocamento máximo de um ponto (px)
  var CORNER_DISP = 32;           // deslocamento por eixo dos 4 cantos (32px em x e y → célula dobra de 64 para 128)
  var INFLUENCE_RADIUS = 128;     // raio de influência sobre os vizinhos (px)
  var NEIGHBOR_DISP = 18;         // deslocamento máximo dos vizinhos (px), com falloff

  var EASE_OPEN = 0.18;           // fator de ease-out durante a abertura
  var SPRING_STIFFNESS = 0.12;    // rigidez da mola no retorno
  var SPRING_DAMPING = 0.82;      // amortecimento da mola no retorno
  var REST_EPSILON = 0.05;        // limiar para considerar um ponto em repouso

  // ---------------------------------------------------------
  // Sinal de "grade pronta": o preloader espera este sinal para
  // liberar a saída do splash. A flag em window cobre o caso de
  // o listener ser registrado depois do disparo do evento.
  // ---------------------------------------------------------
  function sinalizarGradePronta() {
    if (window.__gradePronta) return;
    window.__gradePronta = true;
    window.dispatchEvent(new Event('grade:pronta'));
  }

  // ---------------------------------------------------------
  // Estado do canvas
  // ---------------------------------------------------------
  var canvas = document.getElementById('grid-canvas');
  if (!canvas) {
    console.error('Grade: o seletor "#grid-canvas" não encontrou nenhum elemento no HTML. Malha desativada.');
    sinalizarGradePronta(); // não prende o preloader se a malha falhar
    return;
  }
  var ctx = canvas.getContext('2d');


  var viewW = 0;                  // largura da viewport (px CSS)
  var viewH = 0;                  // altura da viewport (px CSS)
  var dpr = 1;                    // devicePixelRatio atual

  // ---------------------------------------------------------
  // Estado da grade de pontos (arrays planos: sem objetos,
  // sem garbage collection dentro do loop de animação)
  // ---------------------------------------------------------
  var cols = 0;                   // nº de pontos na horizontal
  var rows = 0;                   // nº de pontos na vertical
  var total = 0;                  // cols * rows

  var origX = null;               // posição original X de cada ponto
  var origY = null;               // posição original Y de cada ponto
  var posX = null;                // posição atual X
  var posY = null;                // posição atual Y
  var velX = null;                // velocidade X (usada na mola de retorno)
  var velY = null;                // velocidade Y
  var tgtX = null;                // deslocamento-alvo X (relativo à origem)
  var tgtY = null;                // deslocamento-alvo Y

  // Conjunto de pontos "ativos" (deslocados ou em movimento).
  // Só esses pontos são atualizados por frame — o resto da grade
  // é ignorado, evitando cálculos desnecessários.
  var active = null;              // Int32Array com índices ativos
  var activeCount = 0;
  var isActive = null;            // Uint8Array: flag por ponto (evita duplicatas)

  // ---------------------------------------------------------
  // Estado da interação
  // ---------------------------------------------------------
  var pressed = false;            // botão/toque pressionado?
  var pointerX = 0;               // posição atual do ponteiro (px CSS)
  var pointerY = 0;
  var currentCellI = -1;          // célula atualmente aberta (coluna)
  var currentCellJ = -1;          // célula atualmente aberta (linha)

  // ---------------------------------------------------------
  // Controle do loop de render (dirty flag)
  // ---------------------------------------------------------
  var rafId = 0;                  // id do requestAnimationFrame (0 = parado)
  var needsRender = false;        // há algo para redesenhar?

  // ---------------------------------------------------------
  // Construção / reconstrução da grade
  // ---------------------------------------------------------
  // Capacidade alocada dos arrays: só realoca quando a grade
  // cresce além dela, evitando garbage collection durante um
  // resize contínuo (os arrays são reaproveitados)
  var capacity = 0;

  function allocArrays(minTotal) {
    if (minTotal <= capacity) return;
    // Margem de 25% para absorver pequenos crescimentos futuros
    capacity = Math.ceil(minTotal * 1.25);
    origX = new Float32Array(capacity);
    origY = new Float32Array(capacity);
    posX = new Float32Array(capacity);
    posY = new Float32Array(capacity);
    velX = new Float32Array(capacity);
    velY = new Float32Array(capacity);
    tgtX = new Float32Array(capacity);
    tgtY = new Float32Array(capacity);
    active = new Int32Array(capacity);
    isActive = new Uint8Array(capacity);
  }

  function buildGrid() {
    // Estado anterior, usado para preservar pontos em movimento
    // quando a grade é reconstruída no meio de uma animação
    var oldCols = cols;
    var oldRows = rows;
    var oldPosX = posX, oldPosY = posY;
    var oldVelX = velX, oldVelY = velY;
    var oldTgtX = tgtX, oldTgtY = tgtY;
    var oldIsActive = isActive;

    viewW = window.innerWidth;
    viewH = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    // Canvas físico em pixels reais + transform para px CSS,
    // garantindo linhas nítidas em telas retina
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Espaçamento sempre fixo: telas maiores recebem mais pontos.
    // +2 pontos extras para as linhas cobrirem a borda direita/inferior.
    cols = Math.floor(viewW / SPACING) + 2;
    rows = Math.floor(viewH / SPACING) + 2;
    total = cols * rows;

    var reuse = origX !== null && capacity >= total;
    allocArrays(total);
    activeCount = 0;

    // Posiciona cada ponto na sua interseção. Como a grade é
    // ancorada no canto superior esquerdo, um ponto (i, j) existe
    // nas duas grades: copiamos seu estado (posição, velocidade,
    // alvo) para que uma animação em andamento não "salte"
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var idx = j * cols + i;
        var ox = i * SPACING;
        var oy = j * SPACING;
        origX[idx] = ox;
        origY[idx] = oy;

        var oidx = -1;
        if (oldPosX !== null && i < oldCols && j < oldRows) {
          oidx = j * oldCols + i;
        }

        if (oidx >= 0 && oldIsActive[oidx] === 1) {
          // Ponto estava em movimento: preserva o estado
          posX[idx] = oldPosX[oidx];
          posY[idx] = oldPosY[oidx];
          velX[idx] = oldVelX[oidx];
          velY[idx] = oldVelY[oidx];
          tgtX[idx] = oldTgtX[oidx];
          tgtY[idx] = oldTgtY[oidx];
          isActive[idx] = 0; // activate() reinsere no conjunto
          activate(idx);
        } else {
          posX[idx] = ox;
          posY[idx] = oy;
          velX[idx] = 0;
          velY[idx] = 0;
          tgtX[idx] = 0;
          tgtY[idx] = 0;
          if (reuse) isActive[idx] = 0; // limpa flag de uso anterior
        }
      }
    }

    requestRender();
  }

  // ---------------------------------------------------------
  // Gestão do conjunto de pontos ativos
  // ---------------------------------------------------------
  function activate(idx) {
    if (isActive[idx] === 0) {
      isActive[idx] = 1;
      active[activeCount++] = idx;
    }
  }

  // ---------------------------------------------------------
  // Cálculo dos alvos de deslocamento para a célula (ci, cj)
  // ---------------------------------------------------------
  function setTargetsForCell(ci, cj) {
    // Centro da célula clicada
    var cx = (ci + 0.5) * SPACING;
    var cy = (cj + 0.5) * SPACING;

    // Zera os alvos dos pontos ativos da célula anterior:
    // eles voltam suavemente enquanto os novos abrem
    for (var a = 0; a < activeCount; a++) {
      var p = active[a];
      tgtX[p] = 0;
      tgtY[p] = 0;
    }

    // Percorre apenas os pontos dentro da caixa que envolve o
    // raio de influência (≈ 2 células para cada lado), nunca a
    // grade inteira
    var range = Math.ceil(INFLUENCE_RADIUS / SPACING);
    var iMin = Math.max(0, ci - range);
    var iMax = Math.min(cols - 1, ci + 1 + range);
    var jMin = Math.max(0, cj - range);
    var jMax = Math.min(rows - 1, cj + 1 + range);

    for (var j = jMin; j <= jMax; j++) {
      for (var i = iMin; i <= iMax; i++) {
        var idx = j * cols + i;
        var dx = origX[idx] - cx;
        var dy = origY[idx] - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);

        // É um dos 4 cantos da célula clicada?
        var isCorner =
          (i === ci || i === ci + 1) && (j === cj || j === cj + 1);

        var mx = 0;
        var my = 0;

        if (isCorner) {
          // Cantos: afastam-se do centro 32px em cada eixo,
          // dobrando a célula de 64px para 128px
          mx = dx > 0 ? CORNER_DISP : -CORNER_DISP;
          my = dy > 0 ? CORNER_DISP : -CORNER_DISP;
        } else if (dist < INFLUENCE_RADIUS && dist > 0) {
          // Vizinhos: falloff suave e curto, apenas para
          // acomodar a abertura sem quebras bruscas
          var t = 1 - dist / INFLUENCE_RADIUS;
          var mag = NEIGHBOR_DISP * t * t; // curva quadrática (suave)
          mx = (dx / dist) * mag;
          my = (dy / dist) * mag;
        } else {
          continue; // fora do raio: não é tocado
        }

        // Limita o deslocamento total a MAX_DISP (64px), nunca mais
        var len = Math.sqrt(mx * mx + my * my);
        if (len > MAX_DISP) {
          mx = (mx / len) * MAX_DISP;
          my = (my / len) * MAX_DISP;
        }

        tgtX[idx] = mx;
        tgtY[idx] = my;
        activate(idx);
      }
    }
  }

  // Zera todos os alvos (usado ao soltar o botão/toque)
  function clearTargets() {
    for (var a = 0; a < activeCount; a++) {
      var p = active[a];
      tgtX[p] = 0;
      tgtY[p] = 0;
    }
  }

  // Descobre a célula sob o ponteiro e atualiza os alvos
  // (só recalcula se o ponteiro mudou de célula)
  function updateCellFromPointer() {
    var ci = Math.floor(pointerX / SPACING);
    var cj = Math.floor(pointerY / SPACING);
    if (ci < 0 || cj < 0 || ci >= cols - 1 || cj >= rows - 1) return;
    if (ci === currentCellI && cj === currentCellJ) return;
    currentCellI = ci;
    currentCellJ = cj;
    setTargetsForCell(ci, cj);
    requestRender();
  }

  // ---------------------------------------------------------
  // Física: atualização dos pontos ativos
  // Retorna true se algum ponto ainda está em movimento
  // ---------------------------------------------------------
  function updatePoints() {
    var moving = false;
    var a = 0;

    while (a < activeCount) {
      var idx = active[a];
      var goalX = origX[idx] + tgtX[idx];
      var goalY = origY[idx] + tgtY[idx];
      var dx = goalX - posX[idx];
      var dy = goalY - posY[idx];

      if (pressed && (tgtX[idx] !== 0 || tgtY[idx] !== 0)) {
        // Abertura: interpolação ease-out em direção ao alvo
        posX[idx] += dx * EASE_OPEN;
        posY[idx] += dy * EASE_OPEN;
        velX[idx] = 0;
        velY[idx] = 0;
      } else {
        // Retorno: mola (aceleração proporcional à distância
        // + amortecimento da velocidade)
        velX[idx] = (velX[idx] + dx * SPRING_STIFFNESS) * SPRING_DAMPING;
        velY[idx] = (velY[idx] + dy * SPRING_STIFFNESS) * SPRING_DAMPING;
        posX[idx] += velX[idx];
        posY[idx] += velY[idx];
      }

      // Ponto em repouso no alvo? Se o alvo é a origem e nada o
      // segura, ele pode ser desativado (sai do conjunto ativo)
      var atRest =
        Math.abs(goalX - posX[idx]) < REST_EPSILON &&
        Math.abs(goalY - posY[idx]) < REST_EPSILON &&
        Math.abs(velX[idx]) < REST_EPSILON &&
        Math.abs(velY[idx]) < REST_EPSILON;

      if (atRest && tgtX[idx] === 0 && tgtY[idx] === 0) {
        // Encaixa exatamente na origem e remove do conjunto ativo
        // (swap com o último índice — sem alocação)
        posX[idx] = origX[idx];
        posY[idx] = origY[idx];
        velX[idx] = 0;
        velY[idx] = 0;
        isActive[idx] = 0;
        activeCount--;
        active[a] = active[activeCount];
        // não incrementa "a": o índice trocado precisa ser avaliado
      } else {
        if (!atRest) moving = true;
        a++;
      }
    }

    return moving;
  }

  // ---------------------------------------------------------
  // Desenho: um único path com todas as linhas, um único stroke
  // ---------------------------------------------------------
  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.beginPath();

    var i, j, idx;

    // Linhas horizontais: polilinha por cada linha de pontos
    for (j = 0; j < rows; j++) {
      idx = j * cols;
      ctx.moveTo(posX[idx], posY[idx]);
      for (i = 1; i < cols; i++) {
        idx++;
        ctx.lineTo(posX[idx], posY[idx]);
      }
    }

    // Linhas verticais: polilinha por cada coluna de pontos
    for (i = 0; i < cols; i++) {
      idx = i;
      ctx.moveTo(posX[idx], posY[idx]);
      for (j = 1; j < rows; j++) {
        idx += cols;
        ctx.lineTo(posX[idx], posY[idx]);
      }
    }

    ctx.stroke();
  }

  // ---------------------------------------------------------
  // Loop de render com dirty flag: roda apenas enquanto houver
  // movimento ou interação; caso contrário, para completamente
  // ---------------------------------------------------------
  function frame() {
    rafId = 0;

    var moving = updatePoints();
    draw();
    needsRender = false;
    sinalizarGradePronta(); // primeiro desenho concluído

    // Continua o loop só se algo ainda se move ou se o usuário
    // segue pressionando (o cursor pode mudar de célula)
    if (moving || pressed || activeCount > 0) {
      rafId = requestAnimationFrame(frame);
    }
  }

  // Agenda um frame se o loop estiver parado
  function requestRender() {
    needsRender = true;
    if (rafId === 0) {
      rafId = requestAnimationFrame(frame);
    }
  }

  // ---------------------------------------------------------
  // Eventos de ponteiro (mouse + touch unificados)
  // ---------------------------------------------------------
  function onPointerDown(e) {
    // Ignora interações que começam sobre a UI (header, chat,
    // drawer, links e campos): a malha só reage no fundo da página
    if (e.target.closest && e.target.closest('header, #chat-jessy-ia, .drawer-menu, a, button, input')) return;
    pressed = true;
    pointerX = e.clientX;
    pointerY = e.clientY;
    updateCellFromPointer();
    requestRender();
  }

  function onPointerMove(e) {
    if (!pressed) return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    // O efeito acompanha o cursor: se mudou de célula, reabre lá
    updateCellFromPointer();
  }

  function onPointerUp() {
    if (!pressed) return;
    pressed = false;
    currentCellI = -1;
    currentCellJ = -1;
    clearTargets();     // todos os pontos voltam à origem via mola
    requestRender();
  }

  // Pointer Events cobrem mouse e touch nos navegadores modernos
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('blur', onPointerUp);

  // ---------------------------------------------------------
  // Resize: reconstrói a grade imediatamente a cada evento.
  // As linhas acompanham a janela em tempo real — nada de
  // "saltar" para a posição nova depois de uma pausa. O rebuild
  // custa fração de milissegundo e reaproveita os arrays (sem
  // alocação em resize contínuo), então não precisa de debounce.
  // Chamada síncrona (sem requestAnimationFrame) para funcionar
  // também com a aba em segundo plano, onde o rAF congela.
  // ---------------------------------------------------------
  window.addEventListener('resize', function () {
    if (window.innerWidth === viewW && window.innerHeight === viewH) return;
    buildGrid();
  });

  // ---------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------
  buildGrid();
  document.body.classList.add('interagindo');
})();
