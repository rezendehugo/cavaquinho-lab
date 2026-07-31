const copyElements = 'h1,h2,h3,h4,h5,h6,p,span,strong,small,label,button,a,dt,dd,summary,li';
const ignoredContainers = [
  '[aria-hidden="true"]',
  '.visually-hidden',
  '[data-ui-copy-dynamic]',
  '.fretboard-stage',
  '.chord-diagram',
  '.score-original-preview',
  '.solo-sequence',
  '.sequence-chord-navigator',
  'svg',
  'canvas',
  'iframe'
].join(',');

function visibleLeafText(element) {
  if (!Cypress.$(element).is(':visible') || element.closest(ignoredContainers)) return '';
  const hasVisibleCopyChild = [...element.children].some(child =>
    child.matches(copyElements) && Cypress.$(child).is(':visible')
  );
  if (hasVisibleCopyChild) return '';
  return element.textContent
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?:;]+$/u, '')
    .toLocaleLowerCase('pt-BR');
}

Cypress.Commands.add('auditVisibleCopy', () => {
  cy.document().then(document => {
    const occurrences = new Map();
    for (const element of document.querySelectorAll(copyElements)) {
      const text = visibleLeafText(element);
      const words = text.match(/[\p{L}]+/gu) || [];
      if (text.length < 8 || words.length < 2 || /\d/u.test(text)) continue;
      const items = occurrences.get(text) || [];
      items.push(element);
      occurrences.set(text, items);
    }
    const duplicates = [...occurrences.entries()].filter(([, elements]) => elements.length > 1);
    if (!duplicates.length) return;
    const details = duplicates.map(([text, elements]) => {
      const locations = elements.map(element => {
        const id = element.id ? `#${element.id}` : '';
        const classes = [...element.classList].slice(0, 2).map(name => `.${name}`).join('');
        return `${element.tagName.toLowerCase()}${id}${classes}`;
      });
      return `"${text}" em ${locations.join(', ')}`;
    });
    throw new Error(`Cópia estática duplicada na página:\n${details.join('\n')}`);
  });
});
