/* global console, process */
import fs from 'node:fs';

const requiredSections = [
  'Issue vinculada',
  'Plano de execução',
  'Resultado esperado',
  'Evidências de teste e validação'
];

const sectionPattern = (title) => new RegExp(`^##\\s+${title}\\s*$`, 'im');
const isTestFile = (file) => /(^|\/)(test|tests|__tests__)\//.test(file) || /\.(test|spec|cy)\.[cm]?[jt]sx?$/.test(file);
const isProductCode = (file) => /^(src|apps|workers)\//.test(file) && !isTestFile(file);

export function validatePullRequest({ body = '', baseRef = '', changedFiles = [] }) {
  const failures = requiredSections
    .filter((section) => !sectionPattern(section).test(body))
    .map((section) => `Seção obrigatória ausente: "${section}".`);

  if (!/(?:fecha|fech[ae]|fix(?:es|ed)?|resolve(?:s|d)?|close(?:s|d)?|issue)\s*#\d+/i.test(body)) {
    failures.push('Inclua uma issue vinculada, por exemplo "Fecha #123".');
  }

  const isPromotion = baseRef === 'main';
  if (isPromotion && !sectionPattern('Evidências de HML').test(body)) {
    failures.push('Promoções para main exigem a seção "Evidências de HML" com URL da RC, SHA e resultado da validação humana.');
  }

  const typeMatch = body.match(/^##\s+Tipo de mudança\s*\n+([^\n]+)/im);
  const changeType = typeMatch?.[1].trim().toLowerCase();
  if (!changeType) failures.push('Informe "Tipo de mudança" (bug, feature, docs, ci ou refactor).');

  const changesProductCode = changedFiles.some(isProductCode);
  const changesTests = changedFiles.some(isTestFile);
  if (changesProductCode && !changesTests) {
    failures.push('Código de produto foi alterado sem teste relacionado no diff. Inclua regressão e edge cases.');
  }
  if (changeType === 'bug' && !changesTests) {
    failures.push('Correções de bug exigem ao menos um teste de regressão ou edge case alterado no PR.');
  }

  return failures;
}

if (process.argv[1]?.endsWith('validate-pr-evidence.mjs')) {
  const [eventPath, ...changedFiles] = process.argv.slice(2);
  if (!eventPath) throw new Error('Informe o caminho do evento de pull request.');
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const failures = validatePullRequest({
    body: event.pull_request?.body || '',
    baseRef: event.pull_request?.base?.ref || '',
    changedFiles
  });
  if (failures.length) {
    console.error(['PR sem evidência suficiente:', ...failures.map((failure) => `- ${failure}`)].join('\n'));
    process.exit(1);
  }
  console.log('Evidências obrigatórias do PR confirmadas.');
}
