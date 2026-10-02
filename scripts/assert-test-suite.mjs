/* global console, process */
import fs from 'node:fs';

const minimumTests = 211;
const resultPath = process.argv[2];
if (!resultPath) throw new Error('Informe o relatório JSON do Vitest.');
const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

if (!result.success) {
  throw new Error('A execução do Vitest reportou falha; o piso de quantidade não substitui uma suíte verde.');
}
if (result.numTotalTests < minimumTests) {
  throw new Error(`A suíte declarou ${result.numTotalTests} testes; o piso aprovado é ${minimumTests}. Não reduza cobertura por remoção silenciosa de testes.`);
}
if (result.numPassedTests + result.numPendingTests !== result.numTotalTests) {
  throw new Error(`A suíte possui testes não aprovados: ${result.numPassedTests} aprovados, ${result.numPendingTests} ignorados, ${result.numTotalTests} no total.`);
}
console.log(`Piso de testes confirmado: ${result.numPassedTests} aprovados + ${result.numPendingTests} ignorado(s) = ${result.numTotalTests}.`);
