/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const allowedReasons = new Set(['workflow', 'destructive', 'mode', 'domain-choice']);
const violations = [];

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return entry.name.endsWith('.jsx') ? [absolute] : [];
  });
}

function attribute(node, name) {
  return node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.text === name);
}

function literalAttributeValue(node) {
  if (!node?.initializer) return '';
  if (ts.isStringLiteral(node.initializer)) return node.initializer.text;
  if (ts.isJsxExpression(node.initializer) && ts.isStringLiteral(node.initializer.expression)) {
    return node.initializer.expression.text;
  }
  return '';
}

function visibleStaticText(node) {
  if (ts.isJsxText(node)) return node.text;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isJsxExpression(node)) {
    return node.expression && ts.isStringLiteral(node.expression) ? node.expression.text : '';
  }
  if (ts.isJsxElement(node)) return node.children.map(visibleStaticText).join(' ');
  if (ts.isJsxFragment(node)) return node.children.map(visibleStaticText).join(' ');
  return '';
}

function lineOf(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function inspectButton(source, file, node) {
  const opening = node.openingElement;
  if (opening.tagName.getText(source) !== 'button') return;
  const text = node.children.map(visibleStaticText).join(' ').replace(/\s+/g, ' ').trim();
  const role = literalAttributeValue(attribute(opening, 'role'));
  const reason = literalAttributeValue(attribute(opening, 'data-ui-text-reason'));
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  const location = `${path.relative(root, file)}:${lineOf(source, node)}`;

  if (words.length > 1 && role !== 'tab' && !allowedReasons.has(reason)) {
    violations.push(`${location} botão com texto longo sem justificativa: "${text}"`);
  }
  if (!text) {
    const ariaLabel = attribute(opening, 'aria-label');
    const title = attribute(opening, 'title');
    if (!ariaLabel) violations.push(`${location} botão iconográfico sem aria-label`);
    if (!title) violations.push(`${location} botão iconográfico sem tooltip title`);
  }
  if (reason && !allowedReasons.has(reason)) {
    violations.push(`${location} justificativa desconhecida: "${reason}"`);
  }
}

for (const file of sourceFiles(sourceRoot)) {
  const content = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  function visit(node) {
    if (ts.isJsxElement(node)) inspectButton(source, file, node);
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (violations.length) {
  console.error(`\nAuditoria estática da UI encontrou ${violations.length} problema(s):\n`);
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('\nPrefira IconButton. Texto com mais de uma palavra exige uma razão de UI controlada.\n');
  process.exit(1);
}

console.log('Auditoria estática da UI aprovada.');
