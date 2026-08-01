const authorization = { authorization: 'Bearer dev:local-user' };

function pollImport(id, attempts = 180) {
  if (attempts <= 0) throw new Error(`A importação ${id} não terminou dentro do limite.`);
  return cy.request({
    url: `http://127.0.0.1:8080/v1/score-imports/${id}`,
    headers: authorization,
  }).then(response => {
    const status = response.body.item.status;
    if (['draft', 'needs_correction', 'ready'].includes(status) && response.body.draft) return response.body;
    if (status === 'failed') throw new Error(response.body.item.lastErrorCode || 'OMR failed');
    cy.wait(1000);
    return pollImport(id, attempts - 1);
  });
}

function fitEvents(measure) {
  const source = measure.events.filter(event => event.durationTicks > 0);
  if (!source.length) {
    return [{
      id: crypto.randomUUID(), offsetTicks: 0, durationTicks: measure.expectedTicks,
      pitch: null, rest: true, tie: null, confidence: 1, alternatives: [],
    }];
  }
  let remaining = measure.expectedTicks;
  let offsetTicks = 0;
  const events = [];
  for (const event of source) {
    if (remaining <= 0) break;
    const durationTicks = Math.min(event.durationTicks, remaining);
    events.push({ ...event, offsetTicks, durationTicks });
    remaining -= durationTicks;
    offsetTicks += durationTicks;
  }
  if (remaining > 0) events.at(-1).durationTicks += remaining;
  return events;
}

describe('Nivaldo no choro com serviços reais', () => {
  it('importa, revisa e cria sequência e solo sem substituir práticas existentes', () => {
    cy.env(['nivaldoPdf']).then(environment => {
      const pdfPath = environment.nivaldoPdf;
      if (!pdfPath) {
        cy.log('Corpus privado não configurado; jornada real ignorada.');
        return;
      }
      cy.request('http://127.0.0.1:8080/api/health').its('body.status').should('equal', 'ok');
      cy.intercept('PUT', '**/v1/development-uploads/**').as('uploadFile');
      cy.intercept('POST', /\/v1\/score-imports$/).as('createImport');

      cy.visit('/practice');
      cy.contains('[role="tab"]', 'Partitura').click();
      cy.get('[aria-label="Escolher PDF, MusicXML ou MXL"]').selectFile(pdfPath);
      cy.contains('button', 'Enviar partitura').click();
      cy.wait('@uploadFile', { timeout: 20_000 }).its('response.statusCode').should('equal', 204);
      cy.wait('@createImport').then(interception => {
        const importId = interception.response.body.id || interception.response.body.item?.id;
        expect(importId, JSON.stringify(interception.response.body)).to.be.a('string').and.not.be.empty;
        pollImport(importId).then(result => {
        expect(result.draft.measures.length).to.be.within(68, 75);
        let revision = result.draft.revision;
        const critical = result.draft.measures.filter(measure =>
          measure.issues.some(issue => issue.severity === 'critical'));
        cy.wrap(critical).each(measure => {
          cy.request({
            method: 'PATCH',
            url: `http://127.0.0.1:8080/v1/score-imports/${importId}/measures/${measure.number}`,
            headers: authorization,
            body: { revision, events: fitEvents(measure), chords: measure.chords },
          }).then(response => { revision = response.body.revision; });
        }).then(() => {
          cy.reload();
          cy.contains('[role="tab"]', 'Partitura').click();
          cy.contains(/Nivaldo no choro/i, { timeout: 20_000 }).should('be.visible');
          cy.contains('medidas precisam de revisão').should('not.exist');
          cy.contains('label', 'De').find('select').select('3');
          cy.contains('label', 'Até').find('select').select('4');
          cy.contains('button', 'Validar e criar prática').click();
          cy.contains('Sua prática está pronta').should('be.visible');
          cy.contains('button', 'Praticar sequência').should('be.visible');
          cy.contains('button', 'Praticar solo').should('be.visible');
          cy.window().then(window => {
            const sequences = JSON.parse(window.localStorage.getItem('cavaquinhoLabSequences'));
            const solos = JSON.parse(window.localStorage.getItem('cavaquinhoLabFreeSolos')).solos;
            expect(sequences.some(sequence => sequence.sourceImportId === importId)).to.equal(true);
            expect(
              solos.some(solo => solo.sourceImportId === importId),
              JSON.stringify(solos.map(solo => ({ id: solo.id, sourceImportId: solo.sourceImportId })))
            ).to.equal(true);
          });
        });
        });
      });
    });
  });
});
