describe('importação revisável de partitura', () => {
  it('fica dentro da Prática e cria somente o trecho confirmado', () => {
    const measure = {
      number: 1,
      divisions: 1,
      expectedTicks: 4,
      events: [{
        id: 'ec733b83-5ef7-4acf-8a41-31016dcc2665',
        offsetTicks: 0,
        durationTicks: 4,
        pitch: { step: 'D', alter: 0, octave: 4 },
        rest: false,
        tie: null,
        confidence: 1,
        alternatives: []
      }],
      chords: [{
        id: '1cb371ce-5e7d-45e9-a0a4-9423c4327d80',
        offsetTicks: 0,
        symbol: 'Dm7',
        confidence: 1,
        alternatives: []
      }],
      issues: []
    };
    const draft = {
      id: 'draft-1',
      importId: 'import-1',
      ownerId: 'local-user',
      title: 'Sábado à tarde',
      composer: null,
      revision: 1,
      meter: { beats: 4, beatType: 4 },
      tempo: 80,
      measures: [measure],
      sections: [{ id: 'section-1', title: 'Seção 1', startMeasure: 1, endMeasure: 1 }],
      sourceMusicXml: '<score-partwise version="4.0"><part-list/><part id="P1"/></score-partwise>',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const item = { id: 'import-1', status: 'draft', sourceType: 'musicxml', pageCount: 0 };

    cy.intercept('POST', '**/v1/score-imports/musicxml', { statusCode: 201, body: { item, draft } });
    cy.intercept('POST', '**/v1/score-imports/import-1/validate', {
      statusCode: 200,
      body: { ...item, status: 'ready' }
    });
    cy.intercept('POST', '**/v1/score-imports/import-1/create-practice', request => {
      expect(request.body.range).to.deep.equal({ startMeasure: 1, endMeasure: 1 });
      request.reply({
        sequence: {
          id: 'imported-sequence-1',
          title: draft.title,
          sourceImportId: item.id,
          steps: [{ id: 'step-1', symbol: 'Dm7', measure: 1, offsetTicks: 0 }]
        },
        melody: {
          id: 'melody-1',
          title: draft.title,
          sourceImportId: item.id,
          ticksPerQuarter: 1,
          meter: draft.meter,
          tempo: draft.tempo,
          events: []
        }
      });
    });

    cy.visit('/practice');
    cy.contains('[role="tab"]', 'Partitura').click();
    cy.get('[aria-label="Escolher PDF, MusicXML ou MXL"]').selectFile({
      contents: Cypress.Buffer.from('<score-partwise/>'),
      fileName: 'sabado.musicxml',
      mimeType: 'application/vnd.recordare.musicxml+xml'
    });
    cy.contains('button', 'Enviar partitura').click();
    cy.contains('Sábado à tarde').should('be.visible');
    cy.viewport(390, 844);
    cy.contains('[role="tab"]', 'Folha TAB').click();
    cy.get('[aria-label="Folha TAB"]').should('exist');
    cy.contains('[role="tab"]', 'Partitura + TAB').should('have.attr', 'aria-selected', 'true');
    cy.get('[aria-label="Prévia da partitura com tablatura"]')
      .should('not.contain.text', 'Não foi possível renderizar');
    cy.contains('button', 'Markdown').should('be.enabled');
    cy.contains('button', 'Baixar PDF').should('be.enabled');
    cy.contains('button', 'MusicXML').should('not.exist');
    cy.contains('[role="tab"]', 'Somente TAB').click();
    cy.contains('[role="tab"]', 'Somente TAB').should('have.attr', 'aria-selected', 'true');
    cy.get('[aria-label="Prévia somente da tablatura"]')
      .should('not.contain.text', 'Não foi possível renderizar');
    cy.contains(/Layout (original|aproximado)/).should('exist');
    cy.contains('1 medidas selecionadas').should('exist');
    cy.auditVisibleCopy();
    cy.contains('button', 'Validar e criar prática').scrollIntoView().click();
    cy.contains('Sua prática está pronta').should('exist');
    cy.contains('button', 'Praticar sequência').click();
    cy.contains('[role="tab"]', 'Sequência').should('have.attr', 'aria-selected', 'true');
  });

  it('explica a falha e permite retomar uma importação', () => {
    const failed = { id: 'import-failed', status: 'failed', sourceType: 'pdf', originalName: 'falhou.pdf', lastErrorCode: 'audiveris_failed' };
    const recovered = {
      item: { ...failed, status: 'draft', lastErrorCode: null, pageCount: 1 },
      draft: {
        id: 'draft-recovered', importId: failed.id, ownerId: 'local-user', title: 'Partitura recuperada',
        composer: null, revision: 1, meter: { beats: 4, beatType: 4 }, tempo: 80,
        measures: [], sections: [], sourceMusicXml: '<score-partwise version="4.0"><part-list/></score-partwise>'
      }
    };
    let retried = false;
    cy.intercept('GET', '**/v1/score-imports/import-failed', request => {
      request.reply(retried ? recovered : { item: failed, draft: null });
    });
    cy.intercept('POST', '**/v1/score-imports/import-failed/retry', request => {
      retried = true;
      request.reply({ ...failed, status: 'queued', lastErrorCode: null });
    });
    cy.intercept('GET', '**/v1/score-imports/import-failed/source-url', { url: '/source.pdf' });
    cy.visit('/practice', {
      onBeforeLoad(window) { window.sessionStorage.setItem('cavaquinhoLabActiveScoreImport', 'import-failed'); }
    });
    cy.contains('[role="tab"]', 'Partitura').click();
    cy.contains('Não conseguimos reconhecer esta partitura').should('be.visible');
    cy.get('button[aria-label="Tentar novamente"]').click();
    cy.contains('Partitura recuperada').should('be.visible');
    cy.get('button[aria-label="Voltar para etapa Enviar"]').click();
    cy.contains('button', 'Escolher arquivo').should('be.visible');
    cy.window().its('sessionStorage').invoke('getItem', 'cavaquinhoLabActiveScoreImport').should('be.null');
  });

  it('não cria overflow nos tamanhos principais', () => {
    for (const [width, height] of [[390, 844], [720, 900], [1280, 900]]) {
      cy.viewport(width, height);
      cy.visit('/practice');
      cy.contains('[role="tab"]', 'Partitura').click();
      cy.document().then(document => {
        expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
      });
    }
  });
});
