# Auditoria da biblioteca de acordes

Este documento registra o inventário atual da biblioteca de cavaquinho. Os números podem ser reproduzidos com:

```bash
npm run audit:chords
```

## Resumo

| Camada | Raízes | Sufixos | Acordes raiz + qualidade | Referências de shapes |
| --- | ---: | ---: | ---: | ---: |
| Banco original | 12 | 12 | 144 | 1.084 |
| Biblioteca usada pelo app | 12 | 14 | 168 | 1.536 |

- O banco original contém **733 shapes físicos únicos**. O número 1.084 inclui a mesma posição associada a mais de um acorde.
- O app deriva mais 24 acordes: `add9` nas 12 raízes e `m6` nas 12 raízes.
- A expansão reutiliza 341 referências por igualdade exata das classes de altura em todas as qualidades; 106 pertencem a `add9` e 96 a `m6`.
- São restaurados 111 shapes históricos exatos que desapareceram na reconstrução modular, distribuídos por 23 acordes maiores e menores.
- Bm oferece sete voicings completos e um com a terça omitida.
- Todas as 12 raízes possuem entradas para os 12 sufixos originais. “Existe um acorde” não significa que a cobertura de shapes seja equilibrada.

## Cobertura original por qualidade

| Qualidade | Acordes | Shapes | Exatos | Com omissão | Com nota extra |
| --- | ---: | ---: | ---: | ---: | ---: |
| Maior | 12 | 33 | 33 | 0 | 0 |
| Menor | 12 | 29 | 24 | 5 | 0 |
| 6 | 12 | 120 | 96 | 24 | 0 |
| 7 | 12 | 94 | 58 | 36 | 0 |
| 9 | 12 | 118 | 0 | 118 | 0 |
| maj7 | 12 | 132 | 96 | 36 | 0 |
| m7 | 12 | 87 | 51 | 36 | 0 |
| m7♭5 | 12 | 96 | 96 | 0 | 0 |
| dim | 12 | 144 | 12 | 0 | 132 |
| dim7 | 12 | 144 | 96 | 48 | 0 |
| sus4 | 12 | 72 | 72 | 0 | 0 |
| sus2 | 12 | 15 | 15 | 0 | 0 |
| **Total** | **144** | **1.084** | **649** | **303** | **132** |

## O que os resultados significam

- **Exato:** as notas tocadas formam exatamente o acorde declarado, permitindo duplicações em oitavas.
- **Com omissão:** todas as notas tocadas pertencem ao acorde, mas uma ou mais notas teóricas não aparecem. Isso pode ser uma escolha válida no cavaquinho.
- **Com nota extra:** existe uma classe de altura que não pertence à definição atual do acorde. Requer revisão musical ou correção do rótulo.
- Os 118 shapes de acorde `9` têm omissões porque um acorde de nona possui cinco classes de altura e o cavaquinho possui quatro cordas. Eles não devem ser marcados automaticamente como errados.
- O principal alerta é `dim`: 132 de 144 shapes possuem nota extra. Muitos parecem representar `dim7` ou uma leitura simétrica relacionada e precisam de revisão antes de alimentar novas equivalências.
- Existem 12 referências duplicadas dentro do mesmo acorde, concentradas em formas diminutas. Elas não aumentam a cobertura real.
- Fretes, afinação D3–G3–B3–D4 e valores MIDI são estruturalmente consistentes em todas as 4.336 posições de corda tocadas.

## Coberturas mais rasas

- Acordes maiores variam de 2 shapes em várias raízes até 7 em C.
- Acordes menores possuem somente 2 ou 3 shapes por raiz.
- `sus2` possui apenas 1 shape na maioria das raízes e 2 em D, E♭ e A.
- Quantidades altas de diminutos não representam necessariamente variedade: simetria e duplicações criam várias referências para a mesma geometria.
- Depois da restauração e das equivalências exatas, dez acordes ainda possuem menos de três shapes sem notas adicionais: `Cdim`, `Db7`, `Ddim`, `Eb7`, `Fdim`, `Gb7`/`F#7`, `Gdim`, `Ab7`, `Bb7` e `Bbdim`.
- Esses dez casos não possuem shapes históricos exatos disponíveis no corpus conhecido; precisam de novas digitações validadas, não de aliases automáticos.

## Política antes de expandir a biblioteca

1. Não derivar novos símbolos a partir de shapes classificados com nota extra.
2. Reutilizar automaticamente um shape somente quando o conjunto de classes de altura for exatamente igual ao acorde de destino.
3. Exibir omissões ao usuário, mas não tratá-las como erro sem uma regra específica por qualidade.
4. Revisar e corrigir `dim`/`dim7` antes de adicionar substituições diminutas.
5. Contar separadamente acordes, referências, shapes físicos únicos e aliases teóricos.
6. Adicionar um caso de teste para cada correção feita no banco de origem.

## Próxima auditoria recomendada

Gerar um relatório detalhado por shape contendo símbolo, código de casas, MIDI, notas esperadas, notas tocadas, omissões, extras e possíveis rótulos equivalentes. As correções devem acontecer no repositório `chords-db`; este app deve consumir uma versão fixada e auditada do banco.
