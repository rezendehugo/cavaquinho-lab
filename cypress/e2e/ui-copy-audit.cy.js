import { uiAuditScenarios } from '../../src/config';

describe('contrato global de cópia da interface', () => {
  for (const scenario of uiAuditScenarios) {
    it(`não duplica informação estática em ${scenario.id}`, () => {
      cy.visit(scenario.path);
      if (scenario.tab) cy.contains('[role="tab"]', scenario.tab).click();
      cy.auditVisibleCopy();
    });
  }
});
