function installFakeAudioContext(window) {
  class FakeAudioContext {
    constructor() { this.currentTime = 0; this.destination = {}; window.__scaleTestAudioContext = this; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  window.AudioContext = FakeAudioContext;
}

describe('Braço de referência e prática regional', () => {
  it('mantém o Braço simples com apenas o filtro de nota', () => {
    cy.visit('/fretboard');
    cy.get('[aria-label="Destacar nota"]').select('C');
    cy.get('.fretboard-note.highlighted').its('length').should('be.greaterThan', 0);
    cy.get('[aria-label="Tônica da escala"]').should('not.exist');
    cy.contains('button', 'Praticar escala').should('not.exist');
    cy.get('.fretboard-neck').then(($neck) => {
      const box = $neck[0].getBoundingClientRect();
      expect(box.height).to.be.greaterThan(box.width);
    });
  });

  it('usa o espaço desktop com controles ao lado do braço', () => {
    cy.viewport(1440, 900);
    cy.visit('/fretboard');
    cy.get('.fretboard-reference-workspace').then(($workspace) => {
      const workspace = $workspace[0].getBoundingClientRect();
      expect(workspace.width).to.be.greaterThan(800);
    });
    cy.get('.fretboard-reference-sidebar').then(($sidebar) => {
      cy.get('.fretboard-stage').then(($stage) => {
        const sidebar = $sidebar[0].getBoundingClientRect();
        const stage = $stage[0].getBoundingClientRect();
        expect(sidebar.right).to.be.lessThan(stage.left);
        expect(stage.width).to.be.greaterThan(500);
      });
    });
    cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
  });

  describe('Prática', () => {
    beforeEach(() => cy.visit('/practice', { onBeforeLoad: installFakeAudioContext }));

    it('abre o mapa regional sem rota automática e separa as cordas soltas', () => {
      cy.get('.fretboard-note.in-scale').its('length').should('be.greaterThan', 20);
      cy.get('.fretboard-note.path-note').should('not.exist');
      cy.get('.fretboard-open-strings').should('exist');
      cy.get('.fretboard-matrix .matrix-fret-label').should('have.length', 12).each($label => expect($label.text()).not.to.equal('0'));
      cy.contains('button', 'Praticar escala').should('be.disabled');
    });

    it('escolhe início e fim arbitrários usando teclado e toque', () => {
      cy.get('[aria-label^="Adicionar A4, corda 2, casa 2"]').focus().type('{enter}');
      cy.get('[aria-label^="Adicionar F5, corda 3, casa 6"]').click();
      cy.get('.fretboard-note.path-note').should('have.length', 6);
      cy.get('.fretboard-note.path-start').should('have.attr', 'data-note', 'A');
      cy.get('.fretboard-note.path-end').should('have.attr', 'data-note', 'F');
      cy.get('.anchor-status').should('contain.text', 'Caminho pronto');
    });

    it('edita, desfaz, salva, renomeia e exclui o caminho', () => {
      cy.get('[aria-label^="Adicionar A4, corda 2, casa 2"]').click();
      cy.get('[aria-label^="Adicionar F5, corda 3, casa 6"]').click();
      cy.contains('button', 'Editar caminho').click();
      cy.get('.edit-step-list button').first().click();
      cy.get('.fretboard-note.path-candidate').first().click();
      cy.contains('button', 'Desfazer').click();
      cy.get('[aria-label="Nome do caminho"]').clear().type('A até F');
      cy.contains('button', 'Salvar caminho').click();
      cy.get('[aria-label="Nome do caminho selecionado"]').clear().type('Região central');
      cy.contains('button', 'Salvar nome').click();
      cy.get('[aria-label="Caminho selecionado"]').should('contain.text', 'Região central');
      cy.get('[aria-label="Excluir caminho"]').click();
      cy.window().then(window => expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabScalePaths')).paths).to.have.length(0));
    });

    it('faz a contagem e avança uma posição exata por pulso', () => {
      cy.clock();
      cy.get('[aria-label^="Adicionar D5, corda 2, casa 7"]').click();
      cy.get('[aria-label^="Adicionar A5, corda 3, casa 10"]').click();
      cy.contains('button', 'Praticar escala').click();
      cy.get('[role="dialog"][aria-label="Prática focada: C maior"]').as('practiceDialog');
      cy.tick(60);
      cy.get('@practiceDialog').find('.sequence-practice-live').should('contain.text', 'Contagem: 1 de 4');
      cy.window().then(window => { window.__scaleTestAudioContext.currentTime = 3.2; });
      cy.tick(30);
      cy.get('@practiceDialog').find('.fretboard-note.scale-current').should('have.length', 1);
      cy.get('@practiceDialog').find('.fretboard-note.scale-next').should('have.length', 1);
      cy.get('@practiceDialog').find('[aria-label="BPM da prática focada"]').should('have.value', '80');
    });

    it('pratica uma sequência salva sem depender de escala', () => {
      cy.visit('/practice', { onBeforeLoad(window) {
        installFakeAudioContext(window);
        window.localStorage.setItem('cavaquinhoLabSequences', JSON.stringify([{ id: 'daily', title: 'Trocas diárias', steps: [
          { id: 'c', key: 'C', suffix: 'major', positionIndex: 0 },
          { id: 'g', key: 'G', suffix: 'major', positionIndex: null }
        ] }]));
        window.localStorage.setItem('cavaquinhoLabActiveSequenceId', 'daily');
      } });
      cy.contains('[role="tab"]', 'Sequência').click();
      cy.get('[aria-label="Sequência para praticar"]').should('have.value', 'daily');
      cy.get('[aria-label="Batidas por acorde"]').select('1');
      cy.contains('C → G').should('be.visible');
      cy.get('[aria-label="Tônica da escala"]').should('not.exist');
      cy.get('.fretboard-open-strings .fretboard-note.path-note').should('exist');
      cy.contains('button', 'Praticar sequência').should('be.enabled');
      cy.contains('button', 'Praticar sequência').click();
      cy.get('[role="dialog"][aria-label="Prática focada: Trocas diárias"]').within(() => {
        cy.get('[aria-label="Notas pressionadas da sequência em prática focada"]').should('exist');
        cy.get('.sequence-film-carousel').should('not.exist');
      });
    });

    it('cria e pratica um solo livre com notas repetidas', () => {
      cy.contains('[role="tab"]', 'Solo livre').click();
      cy.get('[aria-label^="Adicionar D4, corda 1, casa 0"]').click().click();
      cy.get('[aria-label^="Adicionar C5, corda 3, casa 1"]').click();
      cy.get('[aria-label="Notas do solo"]').should('contain.text', '1. D4').and('contain.text', '2. D4').and('contain.text', '3. C5');
      cy.get('[aria-label="Nome do solo"]').clear().type('Solo cromático');
      cy.contains('button', 'Salvar solo').click();
      cy.window().then(window => expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabFreeSolos')).solos[0].positions).to.have.length(3));
      cy.contains('button', 'Praticar solo').should('be.enabled');
      cy.contains('button', 'Praticar solo').click();
      cy.get('[role="dialog"][aria-label="Prática focada: Solo cromático"]').should('exist').within(() => {
        cy.get('[aria-label="Prática focada do solo livre"]').should('exist');
      });
      cy.get('[aria-label="Tônica da escala"]').should('not.exist');
    });

    it('mantém controles, timeline e braço compactos em todos os breakpoints', () => {
      cy.contains('[role="tab"]', 'Solo livre').click();
      Cypress._.times(30, () => cy.get('[aria-label^="Adicionar D4, corda 1, casa 0"]').click());
      cy.get('.solo-timeline-panel').then(($timeline) => {
        expect($timeline[0].getBoundingClientRect().height).to.be.lessThan(90);
      });
      cy.get('[aria-label="Notas do solo"]').then(($timeline) => {
        expect($timeline[0].scrollWidth).to.be.greaterThan($timeline[0].clientWidth);
      });
      cy.contains('30 notas').should('be.visible');
      cy.contains(/de (64|1000) notas/).should('not.exist');

      for (const [width, height, desktop] of [[390, 844, false], [720, 900, false], [900, 900, true], [1280, 900, true], [1440, 900, true]]) {
        cy.viewport(width, height);
        cy.get('.solo-fretboard-pane').then(($pane) => {
          cy.get('.solo-timeline-panel').then(($timeline) => {
            cy.get('.solo-control-rail').then(($rail) => {
            const rail = $rail[0].getBoundingClientRect();
            const pane = $pane[0].getBoundingClientRect();
            const timeline = $timeline[0].getBoundingClientRect();
            expect(rail.bottom).to.be.at.most(timeline.top + 1);
            expect(timeline.bottom).to.be.at.most(pane.top + 1);
            if (desktop) {
              expect(pane.width).to.be.greaterThan(750);
              expect(pane.width).to.equal(timeline.width);
              expect(rail.width).to.equal(pane.width);
            } else {
              expect(pane.width).to.be.at.most(width);
            }
            });
          });
        });
        if (desktop) {
          cy.get('[aria-label^="Adicionar D4, corda 1, casa 0"]').then(($open) => {
            cy.get('[aria-label^="Adicionar Eb4, corda 1, casa 1"]').then(($firstFret) => {
              const openCenter = $open[0].getBoundingClientRect().x + $open[0].getBoundingClientRect().width / 2;
              const firstFretCenter = $firstFret[0].getBoundingClientRect().x + $firstFret[0].getBoundingClientRect().width / 2;
              expect(firstFretCenter - openCenter).to.be.lessThan(80);
            });
          });
        }
        cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
      }
    });

    it('mantém o modo focado dentro da tela do celular e restaura o foco ao sair', () => {
      cy.viewport(390, 844);
      cy.contains('[role="tab"]', 'Solo livre').click();
      cy.get('[aria-label^="Adicionar D4, corda 1, casa 0"]').click();
      cy.contains('button', 'Praticar solo').click();
      cy.get('[role="dialog"][aria-label="Prática focada: Meu solo"]').should('be.visible');
      cy.get('[role="dialog"][aria-label="Prática focada: Meu solo"] .solo-sequence').should('not.exist');
      cy.get('[role="dialog"][aria-label="Prática focada: Meu solo"] .sequence-practice-live').then(($instruction) => {
        cy.get('[role="dialog"][aria-label="Prática focada: Meu solo"] .fretboard-stage').then(($stage) => {
          expect($instruction[0].getBoundingClientRect().bottom).to.be.at.most($stage[0].getBoundingClientRect().top);
        });
      });
      cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
      cy.contains('button', 'Sair').click();
      cy.contains('button', 'Praticar solo').should('have.focus');
    });

    it('amplia o braço confortavelmente no modo focado desktop', () => {
      cy.viewport(1440, 900);
      cy.contains('[role="tab"]', 'Solo livre').click();
      cy.get('[aria-label^="Adicionar D4, corda 1, casa 0"]').click();
      cy.contains('button', 'Praticar solo').click();
      cy.get('[role="dialog"][aria-label="Prática focada: Meu solo"] .fretboard-stage').then(($stage) => {
        const stage = $stage[0].getBoundingClientRect();
        expect(stage.width).to.be.greaterThan(1300);
        expect(stage.height).to.be.greaterThan(350);
      });
      cy.get('[role="dialog"][aria-label="Prática focada: Meu solo"] .sequence-practice-transport').should('be.visible');
    });

    for (const [width, height, orientation] of [[390, 844, 'vertical'], [720, 900, 'vertical'], [1280, 800, 'horizontal']]) {
      it('mantém prática ' + orientation + ' e quatro abas em ' + width + 'px', () => {
        cy.viewport(width, height);
        cy.get('.tabs a').should('have.length', 4).each(($tab) => {
          const box = $tab[0].getBoundingClientRect();
          expect(box.left).to.be.at.least(0);
          expect(box.right).to.be.at.most(width);
        });
        cy.get('.fretboard-matrix').then(($matrix) => {
          const box = $matrix[0].getBoundingClientRect();
          if (orientation === 'horizontal') expect(box.width).to.be.greaterThan(box.height);
          else expect(box.height).to.be.greaterThan(box.width);
        });
        cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
      });
    }
  });
});
