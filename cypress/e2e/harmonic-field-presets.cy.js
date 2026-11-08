describe('exercícios de campo harmônico', () => {
  beforeEach(() => cy.visit('/sequences'));

  const expectPracticeOrder = expected => {
    expected.forEach((chord, index) => {
      cy.get('.sequence-film-card--current')
        .should('have.attr', 'data-step-index', String(index))
        .and('contain.text', chord);
      if (index < expected.length - 1) cy.get('[aria-label="Próximo acorde"]').click();
    });
  };

  const createAndPractice = presetId => {
    cy.get('button').contains('Exercícios prontos').click();
    cy.get('[aria-label="Exercício"]').select(presetId);
    cy.get('[aria-label="Tonalidade ou início"]').should('have.value', 'Db');
    cy.contains('button', 'Criar sequência').should('be.enabled').click();
    cy.contains('button', 'Iniciar prática').click();
  };

  it('disponibiliza os campos maior e menor harmônico de Db e pratica cada grau na ordem', () => {
    createAndPractice('harmonicFieldMajor-Db');
    expectPracticeOrder(['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim']);
    cy.contains('button', 'Sair').click();

    createAndPractice('harmonicFieldMinor-Db');
    expectPracticeOrder(['Dbm', 'Ebdim', 'Fb+', 'Gbm', 'Ab7', 'Bbb', 'Cdim']);
    cy.window().then(window => {
      const sequences = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'));
      const major = sequences.find(sequence => sequence.presetId === 'harmonicFieldMajor-Db');
      const minor = sequences.find(sequence => sequence.presetId === 'harmonicFieldMinor-Db');
      expect(major.steps).to.have.length(7);
      expect(minor.steps).to.have.length(7);
      expect(minor.steps[4]).to.include({ key: 'Ab', suffix: '7' });
      expect(minor.steps[2]).to.include({ key: 'E', displayKey: 'Fb', suffix: 'aug' });
    });
  });
});
