describe('validação e geração de shapes de acordes', () => {
  it('reduz a sequência principal de formas E7 agrupando opções quase idênticas', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{ id: 'e7-grouped', title: 'E7', steps: [
        { id: 'e7', key: 'E', suffix: '7', positionIndex: null }
      ] }]));
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.sequence-shape-navigation [aria-live="polite"]').invoke('text').then(value => {
      const [, total] = value.split('/').map(Number);
      expect(total).to.be.lessThan(119);
    });
    cy.get('.sequence-chord-workspace').click().type('{rightarrow}');
    cy.get('.sequence-shape-navigation [aria-live="polite"]').should('exist');
  });

  it('ignora o custom Gm6 inválido e destaca somente notas físicas do acorde', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{ id: 'invalid-gm6', title: 'Gm6 inválido', steps: [
        { id: 'gm6', key: 'G', suffix: 'm6', positionIndex: null, customPosition: { frets: [3, 2, 2, 1], fingers: [1, 2, 3, 4] } }
      ] }]));
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.fretboard-stage .path-note').should('have.length.greaterThan', 0).each($note => {
      expect($note.attr('data-degree'), 'nota mostrada pertence a Gm6').not.to.equal('');
      const [, fret] = $note.attr('data-position').split(':').map(Number);
      expect(fret).to.be.at.most(14);
    });
  });

  it('gera, salva e restaura B7b9 1-2-1-4 com os tons escritos', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.clear();
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{ id: 'generated-b7b9', title: 'B7b9 gerado', steps: [
        { id: 'b7b9', key: 'B', suffix: '7b9', positionIndex: null, customPosition: { frets: [1, 2, 0, 4], fingers: [1, 2, 0, 4] } }
      ] }]));
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    const expected = ['0:1', '1:2', '2:1', '3:4'];
    cy.get('.sequence-shape-navigation [aria-live="polite"]').then($counter => {
      const [current, total] = $counter.text().split('/').map(Number);
      const targetGroupIndex = 5;
      Cypress._.times((targetGroupIndex - current + total) % total, () => cy.get('[aria-label="Próxima forma"]').click());
    });
    cy.contains('.sequence-shape-variants summary', 'Variações deste desenho').click();
    cy.get('[aria-label="Usar variação nas casas 1, 2, 1, 4"]').click();
    cy.get('.fretboard-stage .path-note').then($notes => {
      expect([...$notes].map(note => note.getAttribute('data-position')).sort()).to.deep.equal([...expected].sort());
    });
    cy.get('.fretboard-stage .path-note').then($notes => {
      expect([...$notes].map(note => note.getAttribute('data-position')).sort()).to.deep.equal([...expected].sort());
    });
    cy.get('.sequence-note-pills [data-played="true"]').should('contain.text', '♭9').and('contain.text', '3').and('contain.text', '♭7');
    cy.window().then(window => {
      const saved = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0];
      expect(saved.customPosition.frets).to.deep.equal([1, 2, 1, 4]);
    });
    cy.reload();
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.fretboard-stage .path-note').should('have.length', 4).then($notes => {
      expect([...$notes].map(note => note.getAttribute('data-position')).sort()).to.deep.equal([...expected].sort());
    });
    cy.get('.sequence-note-pills [data-played="true"]').should('contain.text', '♭9').and('contain.text', '3').and('contain.text', '♭7');
  });

  it('permite escolher e salvar uma forma aguda e mantém a 7ª menor e a ♭9 em destaque', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{ id: 'high-b7b9', title: 'B7b9 agudo', steps: [
        { id: 'b7b9-high', key: 'B', suffix: '7b9', positionIndex: null, customPosition: { frets: [1, 2, 1, 4], fingers: [1, 2, 3, 4] } }
      ] }]));
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.fretboard-matrix').should('have.attr', 'data-fret-count', '14');
    cy.get('.sequence-practice-panel').find('[aria-label="Editar forma"]').click();
    ['0:13', '1:14', '2:13', '3:13'].forEach(position => {
      cy.get(`.fretboard-stage [data-position="${position}"]`).click();
    });
    cy.get('.sequence-shape-editor-actions').contains('Salvar forma').click();
    cy.get('.sequence-note-pills [data-defining="true"]')
      .should('have.length', 2)
      .each($tone => expect($tone.attr('data-played')).to.equal('true'));
    cy.get('.fretboard-stage .path-note').then($notes => {
      expect([...$notes].map(note => note.getAttribute('data-position')).sort()).to.deep.equal(['0:13', '1:14', '2:13', '3:13']);
      expect([...$notes].filter(note => note.classList.contains('chord-tone-defining')).map(note => note.getAttribute('data-position')).sort()).to.deep.equal(['1:14', '2:13']);
    });
    cy.window().then(window => {
      const saved = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'))[0].steps[0];
      expect(saved.customPosition.frets).to.deep.equal([13, 14, 13, 13]);
    });
    cy.reload();
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.fretboard-stage .path-note').should('have.length', 4);
    cy.get('.sequence-note-pills [data-defining="true"][data-played="true"]').should('have.length', 2);
  });

  it('destaca o par tônica–♭5 que forma o trítone em um acorde meio diminuto', () => {
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{ id: 'c-half-diminished', title: 'Cm7b5', steps: [
        { id: 'cm7b5', key: 'C', suffix: 'm7b5', positionIndex: null, customPosition: { frets: [4, 3, 1, 1], fingers: [4, 3, 1, 2] } }
      ] }]));
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.sequence-note-pills [data-defining="true"]')
      .should('have.length', 2)
      .each($tone => expect($tone.attr('data-played')).to.equal('true'));
    cy.get('.sequence-note-pills [data-defining="true"]').then($tones => {
      expect([...$tones].map(tone => [tone.querySelector('small').textContent, tone.querySelector('b').textContent])).to.deep.equal([['1', 'C'], ['♭5', 'Gb']]);
    });
    cy.get('.fretboard-stage .path-note.chord-tone-defining').should('have.length', 2);
  });

  it('permite usar teclado após clicar no acorde, fórmula, setas e lápis', () => {
    cy.viewport(390, 844);
    cy.visit('/practice', { onBeforeLoad(window) {
      window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{ id: 'keyboard-shapes', title: 'B7b9 teclado', steps: [
        { id: 'b7b9', key: 'B', suffix: '7b9', positionIndex: null, customPosition: { frets: [1, 2, 1, 4], fingers: [1, 2, 3, 4] } }
      ] }]));
    } });
    cy.contains('[role="tab"]', 'Sequência').click();
    cy.get('.sequence-shape-navigation [aria-live="polite"]').as('counter');
    cy.get('.sequence-chord-workspace h3').click();
    cy.focused().should('have.class', 'sequence-chord-workspace');
    cy.get('@counter').invoke('text').then(before => {
      cy.focused().type('{rightarrow}');
      cy.get('@counter').should('not.have.text', before);
    });
    cy.get('.sequence-note-pills > span').first().click();
    cy.focused().should('have.class', 'sequence-chord-workspace').type('{leftarrow}');
    cy.get('[aria-label="Próxima forma"]').click().type('{rightarrow}');
    cy.get('[aria-label="Editar forma"]').click();
    cy.focused().should('have.class', 'fretboard-note').then($note => {
      const [stringIndex, fret] = $note.attr('data-position').split(':').map(Number);
      cy.get('button.fretboard-note').then($notes => {
        const frets = [...$notes]
          .map(note => note.getAttribute('data-position').split(':').map(Number))
          .filter(([candidateString]) => candidateString === stringIndex)
          .map(([, candidateFret]) => candidateFret);
        cy.focused().type(frets.some(candidateFret => candidateFret > fret) ? '{rightarrow}' : '{leftarrow}');
      });
    });
    cy.focused().should('have.class', 'fretboard-note').type('{enter}');
    cy.get('.fretboard-stage').should('not.have.css', 'overflow-x', 'scroll');
  });
});
