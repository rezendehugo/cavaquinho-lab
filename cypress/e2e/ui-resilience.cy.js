const assertNoHorizontalOverflow = () => {
  cy.document().then(document => {
    expect(document.documentElement.scrollWidth, 'página sem overflow horizontal')
      .to.be.at.most(document.documentElement.clientWidth + 1);
  });
};

describe('resiliência visual e teclado', () => {
  [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 }
  ].forEach(viewport => {
    it(`mantém as superfícies principais dentro da tela em ${viewport.name}`, () => {
      cy.viewport(viewport.width, viewport.height);
      ['/shapes', '/sequences', '/fretboard', '/practice'].forEach(path => {
        cy.visit(path);
        cy.get('main').should('be.visible');
        assertNoHorizontalOverflow();
      });
    });
  });

  it('abre a escolha de forma como diálogo focado, fecha com Escape e devolve o foco', () => {
    cy.visit('/sequences');
    cy.get('[aria-label="Adicionar acorde"]').click();
    cy.contains('button', 'Escolher forma').first().as('trigger').click();
    cy.get('[role="dialog"][aria-modal="true"]').should('be.visible');
    cy.focused().should('have.attr', 'aria-label', 'Fechar formas');
    cy.focused().type('{esc}');
    cy.get('[role="dialog"][aria-modal="true"]').should('not.exist');
    cy.get('@trigger').should('have.focus');
  });

  it('explica os graus e uma comparação física sem depender apenas das cores', () => {
    cy.visit('/shapes');
    cy.get('.shape-grid .shape-study-button').first().click();
    cy.get('.shape-study-panel')
      .should('contain.text', 'Fórmula')
      .and('contain.text', 'Esta digitação')
      .and('contain.text', 'O que muda')
      .and('contain.text', 'Corda 1');
    cy.get('.shape-study-panel [aria-label="Comparar forma"]').select('1');
    assertNoHorizontalOverflow();
  });
});
