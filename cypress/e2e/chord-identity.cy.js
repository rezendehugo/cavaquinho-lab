const sequence = [{
  id: 'sequence-layout',
  title: 'Teste de alinhamento',
  steps: [
    { id: 'step-major', key: 'A', suffix: 'major', positionIndex: 0 },
    { id: 'step-minor-seven', key: 'A', suffix: 'm7', positionIndex: 0 },
    { id: 'step-six', key: 'A', suffix: '6', positionIndex: 0 }
  ]
}];

describe('nome e sufixo dos acordes', () => {
  beforeEach(() => {
    cy.visit('/sequences', {
      onBeforeLoad(window) {
        window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify(sequence));
        window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'sequence-layout');
      }
    });
  });

  function verifyChordAlignment() {
    cy.get('.lab-card').should('have.length', 3);
    cy.get('.chord-identity-control').each(($control) => {
      const control = $control[0];
      const card = control.closest('.lab-card');
      const root = control.querySelector('.chord-identity-root input');
      const suffix = control.querySelector('.chord-identity-suffix input');
      const controlBox = control.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      const rootBox = root.getBoundingClientRect();
      const suffixBox = suffix.getBoundingClientRect();

      expect(Math.abs((controlBox.left + controlBox.right) / 2 - (cardBox.left + cardBox.right) / 2), 'símbolo centralizado').to.be.lessThan(1);
      expect(suffixBox.left - rootBox.right, 'espaço entre nota e sufixo').to.be.within(-1, 2);
      expect(root.scrollWidth, 'nota sem recorte').to.be.at.most(root.clientWidth + 1);
      expect(suffix.scrollWidth, 'sufixo sem recorte').to.be.at.most(suffix.clientWidth + 1);
    });
  }

  it('mantém nota e sufixo unidos e centralizados no desktop', () => {
    verifyChordAlignment();

    cy.screenshot('chord-name-alignment');
  });

  it('preserva o alinhamento no celular', () => {
    cy.viewport(390, 844);
    verifyChordAlignment();
    cy.screenshot('chord-name-alignment-mobile');
  });

  it('mantém as setas ocultas até o campo receber foco', () => {
    cy.get('.chord-identity-arrow').should('have.css', 'pointer-events', 'none');
    cy.get('[aria-label="Nota do acorde 1"]').focus();
    cy.get('.chord-identity-root .chord-identity-arrow').should('have.css', 'pointer-events', 'auto');
  });

  it('aceita e apresenta o símbolo brasileiro 6/9', () => {
    cy.get('[aria-label="Nota do acorde 1"]').clear().type('G6/9{enter}');
    cy.get('[aria-label="Sequência atual"]').should('contain.text', 'G6/9');
    cy.get('[aria-label="Sufixo do acorde 1"]').should('have.value', '6/9');
    cy.get('.lab-card').first().find('.voicing-status-dot').should('be.visible');
  });

  it('aceita m9 e 7M(9) e identifica os shapes sem raiz', () => {
    cy.get('[aria-label="Nota do acorde 1"]').clear().type('Gm9{enter}');
    cy.get('[aria-label="Sequência atual"]').should('contain.text', 'Gm9');
    cy.get('.lab-card').first().find('.voicing-status-dot--rootless').should('be.visible');

    cy.visit('/shapes');
    cy.get('[aria-label="Escolher qualidade"]').select('maj9');
    cy.get('.shape-grid .voicing-status-dot--rootless').should('have.length.greaterThan', 0);
    cy.get('.shape-grid .voicing-status-dot--rootless').first()
      .should('have.attr', 'aria-label')
      .and('contain', 'Voicing sem raiz');
  });

  it('mostra o estado musical de cada forma na galeria sem quebrar o layout', () => {
    cy.visit('/shapes');
    cy.get('[aria-label="Escolher qualidade"]').select('69');
    cy.get('.shape-grid .chord-shape-card').should('have.length.greaterThan', 0);
    cy.get('.shape-grid .voicing-status-dot').should('be.visible');
    cy.get('body').then(($body) => {
      expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth + 1);
    });
  });

  it('oferece a cobertura expandida dos dominantes acidentais', () => {
    cy.visit('/shapes');
    cy.get('[aria-label="Escolher raiz"]').select('Db');
    cy.get('[aria-label="Escolher qualidade"]').select('7');
    cy.get('.shape-grid .chord-shape-card').should('have.length', 11);
    cy.contains('h3', 'Db7').should('contain.text', '11 formas');
  });

  it('distingue C7(9) e apresenta cores e texto para os graus', () => {
    cy.get('[aria-label="Nota do acorde 1"]').clear().type('G7(9){enter}');
    cy.get('[aria-label="Sequência atual"]').should('contain.text', 'G7(9)');
    cy.get('.lab-card').first().find('.degree-seventh').should('exist');
    cy.get('.lab-card').first().find('.degree-ninth').should('exist');

    cy.visit('/shapes');
    cy.get('[aria-label="Escolher qualidade"]').select('9');
    cy.get('[aria-label="Escolher qualidade"] option:selected').should('have.text', '7(9)');
    cy.contains('h3', 'C7(9) · 8 formas').should('be.visible');
    cy.contains('Compare as posições abaixo').should('not.exist');
    cy.get('.shape-grid .chord-shape-card').should('have.length', 8);
    cy.get('.chord-legend-strip').should('have.length', 1);
    cy.get('.chord-legend-degree').should('have.length', 5);
    cy.get('.chord-legend-status').should('have.length', 1);
    cy.get('.chord-degree-legend').should('not.exist');
    cy.get('.shape-grid .degree-third').should('have.length.greaterThan', 0);
    cy.get('.shape-grid .degree-seventh').should('have.length.greaterThan', 0);
    cy.get('.shape-grid .degree-ninth').should('have.length.greaterThan', 0);
    cy.get('[aria-label="Mi, terça maior de Dó"]').should('have.length.greaterThan', 0);
    cy.get('[aria-label="Si bemol, sétima menor de Dó"]').should('have.length.greaterThan', 0);
    cy.get('[aria-label="Ré, nona de Dó"]').should('have.length.greaterThan', 0);
    cy.get('.shape-grid .voicing-status-dot--rootless[aria-label*="sétima menor"]').should('have.length', 8);
    ['Dó · 1 · tônica', 'Ré · 9 · nona', 'Mi · 3 · terça maior', 'Sol · 5 · quinta justa', 'Si bemol · ♭7 · sétima menor']
      .forEach((label) => cy.get(`.chord-legend-degree[aria-label="${label}"]`).should('have.length', 1));
    cy.contains('.chord-legend-tooltip', 'Mi · 3 · terça maior').should('not.be.visible');
    cy.get('.chord-legend-degree[aria-label="Mi · 3 · terça maior"]').trigger('mouseover');
    cy.contains('.chord-legend-tooltip', 'Mi · 3 · terça maior').should('be.visible');
    cy.get('.chord-legend-degree[aria-label="Mi · 3 · terça maior"]').trigger('mouseout');
    cy.contains('.chord-legend-tooltip', 'Mi · 3 · terça maior').should('not.be.visible');
    cy.get('.chord-legend-degree[aria-label="Mi · 3 · terça maior"]').focus();
    cy.contains('.chord-legend-tooltip', 'Mi · 3 · terça maior').should('be.visible');

    cy.viewport(390, 844);
    cy.get('body').then(($body) => {
      expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth + 1);
    });
    cy.get('.chord-legend-strip').each(($legend) => {
      expect($legend[0].scrollWidth).to.be.at.most($legend[0].clientWidth + 1);
    });
  });
});
