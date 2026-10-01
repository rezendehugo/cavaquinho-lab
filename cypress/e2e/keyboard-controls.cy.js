describe('controles de teclado', () => {
  const pressGlobal = key => cy.document().then(document => document.activeElement?.blur()).get('body').then($body => {
    $body.attr('tabindex', '-1');
    $body[0].focus();
  }).type(key);

  const installFakeAudioContext = window => {
    class FakeAudioContext {
      constructor() { this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    window.AudioContext = FakeAudioContext;
  };

  beforeEach(() => {
    cy.visit('/sequences', { onBeforeLoad: installFakeAudioContext });
    cy.get('[aria-label="Adicionar acorde"]').should('be.visible');
  });

  it('mantém o sufixo legível e permite editar ou percorrer sem apontador', () => {
    pressGlobal('n');
    cy.get('[aria-label="Sufixo do acorde 1"]').then($input => {
      const box = $input[0].getBoundingClientRect();
      expect(box.width, 'largura mínima do sufixo').to.be.at.least(42);
    });
    cy.get('[aria-label="Sufixo do acorde 1"]').focus().type('{downarrow}').should('have.value', 'm');
    cy.get('[aria-label="Sufixo do acorde 1"]').clear().type('7{enter}').should('have.value', '7');
    cy.get('[aria-label="Sufixo do acorde 1"]').type('{esc}').should('not.have.focus');
    cy.get('[aria-label="Próximo sufixo do acorde 1"]').should('be.visible').and($button => {
      expect($button[0].getBoundingClientRect().height).to.equal(44);
    });
  });

  it('executa comandos globais fora de campos e os bloqueia durante edição', () => {
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.get('.lab-card').should('have.length', 1);
    cy.get('[aria-label="Sufixo do acorde 1"]').focus();
    cy.get('[aria-label="Sufixo do acorde 1"]').trigger('keydown', { key: 's' });
    cy.location('pathname').should('contain', '/sequences');
    cy.get('[aria-label="Sufixo do acorde 1"]').blur();
    cy.get('.lab-card').first().focus();
    pressGlobal('f');
    cy.get('.shape-picker-dialog').should('be.visible');
    cy.get('.shape-picker-dialog').focus().type('{esc}');
    cy.get('.shape-picker-dialog').should('not.exist');
    pressGlobal('?');
    cy.get('[role="dialog"]', { timeout: 4000 }).should('contain.text', 'Atalhos do Cavaquinho Lab');
    pressGlobal('p');
    cy.get('[role="dialog"]').should('contain.text', 'Atalhos do Cavaquinho Lab');
    cy.get('.keyboard-help-dialog').focus().type('{esc}');
    pressGlobal('s');
    cy.location('pathname').should('contain', '/shapes');
  });

  it('seleciona, move e remove cards sem mouse', () => {
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.get('.lab-card').should('have.length', 1);
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.get('.lab-card').should('have.length', 2);
    cy.get('.lab-card').first().focus().type('{rightarrow}');
    cy.get('.lab-card').eq(1).should('have.focus');
    cy.focused().type('{enter}');
    cy.get('[aria-label="Nota do acorde 2"]').should('have.focus');
    cy.get('[aria-label="Nota do acorde 2"]').blur();
    cy.get('.lab-card').eq(1).focus().type('{del}');
    cy.get('.lab-card').should('have.length', 1);
  });

  it('mantém comandos e controles sem overflow no celular e em zoom alto', () => {
    cy.viewport(390, 844);
    pressGlobal('n');
    pressGlobal('?');
    cy.get('.keyboard-help-dialog').should('be.visible');
    cy.document().then(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth + 1);
    });
  });

  it('usa Espaço para pausar a prática focada sem interferir no BPM', () => {
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.contains('button', 'Iniciar prática').click();
    cy.get('[aria-label="Prática imersiva de sequência"]').should('be.visible').focus().type(' ');
    cy.get('[aria-label="Continuar prática"]').should('be.visible');
    cy.get('[aria-label="BPM da prática imersiva"]').focus().type('9').should('have.value', '9');
  });
});
