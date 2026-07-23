function installFakeAudioContext(window) {
  class FakeAudioContext {
    constructor() { this.currentTime = 0; this.destination = {}; window.__sequenceAudioContext = this; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  window.AudioContext = FakeAudioContext;
}

describe('ferramentas da sessão de prática', () => {
  beforeEach(() => {
    cy.visit('/sequences');
  });

  it('oferece temporizador e metrônomo como controles separados', () => {
    cy.get('[aria-label="Sessão de prática"]').should('be.visible');
    cy.get('[aria-label="Metrônomo"]').should('be.visible').click();
    cy.get('[aria-label="Ciclos de prática"]').should('not.exist');
    cy.get('[aria-label="Controle do metrônomo"]').should('be.visible');
    cy.get('[aria-label="Batidas por minuto"]').should('have.value', '80');
    cy.get('.metronome-tempo-stepper').should('be.visible');
    cy.get('[aria-label="Selecionar compasso 4/4"]').should('have.attr', 'aria-pressed', 'true');
  });

  it('responde a setas e entrada numérica do teclado', () => {
    cy.get('[aria-label="Metrônomo"]').click();
    cy.get('[aria-label="Batidas por minuto"]').should('have.focus');
    cy.get('[aria-label="Batidas por minuto"]').focus().type('{uparrow}').should('have.value', '81');
    cy.get('[aria-label="Batidas por minuto"]').type('{downarrow}{downarrow}').should('have.value', '79');
    cy.get('[aria-label="Batidas por minuto"]').blur().focus().type('112{enter}').should('have.value', '112');
    cy.get('[aria-label="Selecionar compasso 4/4"]').focus().type('{uparrow}');
    cy.get('[aria-label="Batidas por minuto"]').should('have.value', '113');
    cy.get('[aria-label="Selecionar compasso 4/4"]').focus().type('9');
    cy.get('[aria-label="Batidas por minuto"]').should('have.focus').and('have.value', '9').type('{enter}').should('have.value', '40');
  });

  it('edita e sincroniza o BPM nos dois modos da Prática', () => {
    cy.visit('/practice');
    cy.get('[aria-label="BPM da prática de escala"]').click().type('104{enter}').should('have.value', '104');
    cy.get('[aria-label="Metrônomo"]').click();
    cy.get('[aria-label="Batidas por minuto"]').should('have.value', '104');
    cy.get('[aria-label="Fechar metrônomo"]').click();
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('[aria-label="BPM da prática de sequência"]').should('have.value', '104').type('{downarrow}').should('have.value', '103');
  });

  it('não sobrepõe cabeçalho e controles', () => {
    cy.viewport(904, 686);
    cy.get('[aria-label="Metrônomo"]').click();
    cy.get('.metronome-header').then(($header) => {
      cy.get('.metronome-tempo').then(($tempo) => {
        const header = $header[0].getBoundingClientRect();
        const tempo = $tempo[0].getBoundingClientRect();
        expect(tempo.top - header.bottom, 'respiro após cabeçalho').to.be.at.least(12);
      });
    });
    cy.screenshot('metronome-layout');
  });

  it('mantém o painel dentro da tela do celular', () => {
    cy.viewport(390, 844);
    cy.get('[aria-label="Metrônomo"]').click();
    cy.get('.metronome-popover').then(($panel) => {
      const box = $panel[0].getBoundingClientRect();
      expect(box.left, 'limite esquerdo').to.be.at.least(0);
      expect(box.right, 'limite direito').to.be.at.most(390);
      expect(box.bottom, 'limite inferior').to.be.at.most(844);
    });
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth, 'sem overflow horizontal').to.equal(document.documentElement.clientWidth);
    });
  });

  it('rola os cards como um filme no pulso do metrônomo', () => {
    cy.visit('/sequences', { onBeforeLoad: installFakeAudioContext });
    cy.clock();
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.get('.sequence-practice-bar').contains('button', 'Durações').click();
    cy.get('[aria-label="Diminuir duração do acorde 1"]').click();
    cy.get('[aria-label="Diminuir duração do acorde 1"]').click();
    cy.get('[aria-label="Diminuir duração do acorde 1"]').click();
    cy.get('[aria-label="Batidas do acorde 1"]').should('contain.text', '1');
    cy.get('[aria-label="Fechar durações"]').click();
    cy.contains('button', 'Iniciar prática').click();
    cy.tick(60);
    cy.get('[aria-label="Prática imersiva de sequência"]').should('be.visible');
    cy.get('.sequence-film-card').should('have.length', 4);
    cy.get('.sequence-film-card--previous').should('have.attr', 'data-step-index', '3');
    cy.get('.sequence-film-card--current').should('have.attr', 'data-step-index', '0');
    cy.get('.sequence-film-card--next').should('have.attr', 'data-step-index', '1');
    cy.get('.sequence-film-card--later').should('have.attr', 'data-step-index', '2');
    cy.get('.sequence-practice-live').should('contain.text', 'Contagem: 1 de 4');
    cy.window().then(window => { window.__sequenceAudioContext.currentTime = 3.2; });
    cy.tick(30);
    cy.get('.sequence-practice-live').should('contain.text', 'card 1 de 4');
    cy.window().then(window => { window.__sequenceAudioContext.currentTime = 4; });
    cy.tick(30);
    cy.get('.sequence-film-card--current').should('have.attr', 'data-step-index', '1');
    cy.get('.sequence-film-card--previous').should('have.attr', 'data-step-index', '0');
    cy.viewport(390, 844);
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth, 'sem overflow horizontal').to.equal(document.documentElement.clientWidth);
      const current = document.querySelector('.sequence-film-card--current').getBoundingClientRect();
      const transport = document.querySelector('.sequence-practice-transport').getBoundingClientRect();
      expect(current.left).to.be.at.least(0);
      expect(current.right).to.be.at.most(390);
      expect(transport.bottom).to.be.at.most(844);
    });
    cy.get('.sequence-practice-overlay-tools').contains('button', 'Durações').click();
    cy.get('.sequence-duration-panel').then(($panel) => {
      const panel = $panel[0].getBoundingClientRect();
      expect(panel.left).to.be.at.least(0);
      expect(panel.right).to.be.at.most(390);
      expect(panel.bottom).to.be.at.most(844);
    });
    cy.get('[aria-label="Fechar durações"]').click();
    cy.get('[aria-label="Pausar prática"]').click();
    cy.get('[aria-label="Continuar prática"]').should('be.visible');
    cy.contains('button', 'Sair').click();
    cy.get('[aria-label="Prática imersiva de sequência"]').should('not.exist');
  });

  it('fixa uma forma pela galeria e volta para escolha automática', () => {
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.contains('button', 'Escolher forma').click();
    cy.get('[aria-label="Fixar forma 3 de 7"]').click();
    cy.contains('Forma 3 fixada').should('be.visible');
    cy.window().then(window => expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0].positionIndex).to.equal(2));
    cy.contains('button', 'Escolher forma').click();
    cy.get('.shape-auto-option').click();
    cy.contains('Forma automática').should('be.visible');
    cy.viewport(390, 844);
    cy.contains('button', 'Escolher forma').click();
    cy.get('.shape-picker-dialog').then(($dialog) => {
      const box = $dialog[0].getBoundingClientRect();
      expect(box.left).to.be.at.least(0);
      expect(box.right).to.be.at.most(390);
      expect(box.bottom).to.be.at.most(844);
    });
  });

  it('cria um quadradinho transposto e respeita o início da repetição', () => {
    cy.visit('/sequences', { onBeforeLoad: installFakeAudioContext });
    cy.get('button').contains('Exercícios prontos').click();
    cy.get('[aria-label="Tonalidade ou início"]').select('D');
    cy.get('[aria-label="Batidas por acorde"]').select('1');
    cy.get('[aria-label="BPM recomendado do exercício"]').click().type('96{enter}');
    cy.get('[aria-label="Prévia dos acordes"]').should('contain.text', 'F#m');
    cy.contains('button', 'Criar sequência').click();
    cy.get('[aria-label="Sequência atual"]').should('contain.text', 'D').and('contain.text', 'F#m');
    cy.contains('Início da repetição').should('be.visible');
    cy.window().then(window => {
      const sequences = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'));
      const created = sequences.find(sequence => sequence.presetId === 'majorSquare');
      expect(created.practiceBpm).to.equal(96);
      expect(created.loopStartIndex).to.equal(1);
      expect(created.steps.every(step => step.practiceBeats === 1)).to.equal(true);
    });
    cy.contains('button', 'Iniciar prática').click();
    cy.get('.sequence-film-card--current').should('have.attr', 'data-step-index', '0');
    for (let index = 0; index < 9; index += 1) cy.get('[aria-label="Próximo acorde"]').click();
    cy.get('.sequence-film-card--current').should('have.attr', 'data-step-index', '1');
    cy.contains('button', 'Sair').click();

    cy.viewport(390, 844);
    cy.get('button').contains('Exercícios prontos').click();
    cy.get('.sequence-preset-dialog').then(($dialog) => {
      const box = $dialog[0].getBoundingClientRect();
      expect(box.left).to.be.at.least(0);
      expect(box.right).to.be.at.most(390);
      expect(box.bottom).to.be.at.most(844);
    });
    cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
  });

  it('explica campo harmônico, função, substituições e movimento das formas', () => {
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.contains('summary', 'Entender e praticar esta sequência').click();
    cy.get('[aria-label="Estudo da sequência"]')
      .should('contain.text', 'Campo harmônico:')
      .and('contain.text', 'Função provável:')
      .and('contain.text', 'Substituições pela função:')
      .and('contain.text', 'Movimento da forma:');
    cy.viewport(390, 844);
    cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
  });
});
