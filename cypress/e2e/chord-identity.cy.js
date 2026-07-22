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
});
