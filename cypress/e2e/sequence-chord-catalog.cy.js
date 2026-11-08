describe('catálogo compacto de formas da sequência', () => {
  it('mostra cada acorde uma vez, compartilha a forma nas repetições e exporta o mapa com música e artista', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
        id: 'repeated-shape', title: 'Wave · Antonio Carlos Jobim', steps: [
          { id: 'g7-first', key: 'G', suffix: '7', practiceBeats: 2 },
          { id: 'dm', key: 'D', suffix: 'minor', practiceBeats: 3 },
          { id: 'g7-repeat', key: 'G', suffix: '7', practiceBeats: 5 }
        ]
      }]));
      window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'repeated-shape');
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('[aria-label="Acordes da sequência"] button').should('have.length', 2);
    cy.get('[aria-label="Acordes da sequência"] button').eq(0).should('contain.text', 'G7').click();
    cy.get('[aria-label="Acordes da sequência"] button').eq(0).should('have.attr', 'aria-label', 'G7, 2 ocorrências');
    cy.get('[aria-label="Próxima forma"]').click();

    cy.window().then(window => {
      const steps = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps;
      expect(steps.map(step => step.practiceBeats)).to.deep.equal([2, 3, 5]);
      expect(steps[0].positionIndex).to.equal(steps[2].positionIndex);
      expect(steps[0].customPosition).to.deep.equal(steps[2].customPosition);
    });
    let selectedPositions;
    cy.get('.fretboard-stage .path-note').then($notes => {
      selectedPositions = [...$notes].map(note => note.getAttribute('data-position')).sort();
      expect(selectedPositions).to.have.length.greaterThan(0);
    });

    cy.reload();
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('[aria-label="Acordes da sequência"] button').should('have.length', 2).eq(0).click();
    cy.get('.fretboard-stage .path-note').then($notes => {
      expect([...$notes].map(note => note.getAttribute('data-position')).sort()).to.deep.equal(selectedPositions);
    });
    cy.get('.sequence-practice-tools > summary').click();
    cy.get('[aria-label="Conteúdo do PDF"]').select('map');
    cy.contains('button', 'Baixar PDF').click();
    cy.get('.sequence-export [role="status"]').should('contain.text', 'PDF pronto');
    cy.readFile('cypress/downloads/Wave-Antonio-Carlos-Jobim-mapa.pdf', { timeout: 10000 }).should('have.length.greaterThan', 1000);
  });

  it('exporta quatro acordes distintos em um mapa de quatro colunas', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
        id: 'four-shape-map', title: 'Quatro formas', steps: [
          { id: 'g7', key: 'G', suffix: '7' },
          { id: 'dm', key: 'D', suffix: 'minor' },
          { id: 'a7', key: 'A', suffix: '7' },
          { id: 'c', key: 'C', suffix: 'major' }
        ]
      }]));
      window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'four-shape-map');
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('[aria-label="Acordes da sequência"] button').should('have.length', 4);
    cy.get('.sequence-practice-tools > summary').click();
    cy.get('[aria-label="Conteúdo do PDF"]').select('map');
    cy.contains('button', 'Baixar PDF').click();
    cy.get('.sequence-export [role="status"]').should('contain.text', 'PDF pronto');
    cy.readFile('cypress/downloads/Quatro-formas-mapa.pdf', 'binary', { timeout: 10000 })
      .should('have.length.greaterThan', 1000)
      .then(contents => {
        expect(contents.slice(0, 5)).to.equal('%PDF-');
        ['G7', 'Dm', 'A7', 'C'].forEach(chord => expect(contents).to.include(chord));
      });
  });

  it('preserva os três blocos regionais na prática e no mapa exportado', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{
        id: 'regional-c-study', title: 'C maior · regiões', regionMode: 'blocks', steps: [
          { id: 'low-c', key: 'C', suffix: 'major', regionId: 'low', regionBlockId: 'c-low', regionSourceStepId: 'source-c' },
          { id: 'middle-c', key: 'C', suffix: 'major', regionId: 'middle', regionBlockId: 'c-middle', regionSourceStepId: 'source-c' },
          { id: 'high-c', key: 'C', suffix: 'major', regionId: 'high', regionBlockId: 'c-high', regionSourceStepId: 'source-c' }
        ]
      }]));
      window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'regional-c-study');
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.sequence-region-label').should('have.length', 1).and('contain.text', 'baixa');
    cy.get('[aria-label="Acordes da sequência"] button').should('have.length', 3);
    cy.get('[aria-label="Acordes da sequência"] button').eq(1).click();
    cy.get('.sequence-region-label').should('contain.text', 'média');
    cy.get('[aria-label="Acordes da sequência"] button').eq(2).click();
    cy.get('.sequence-region-label').should('contain.text', 'aguda');
    cy.get('.sequence-practice-tools > summary').click();
    cy.get('[aria-label="Conteúdo do PDF"]').select('map');
    cy.contains('button', 'Baixar PDF').click();
    cy.get('.sequence-export [role="status"]').should('contain.text', 'PDF pronto');
    cy.readFile('cypress/downloads/C-maior-regioes-mapa.pdf', { timeout: 10000 }).should('have.length.greaterThan', 1000);
  });
});
