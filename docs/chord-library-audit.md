# Auditoria da biblioteca de acordes

Inventário reproduzível da revisão de `chords-db` fixada no `package-lock.json`:

```bash
npm run audit:chords
```

## Resultado atual

| Métrica | Antes do ciclo | Depois do ciclo |
| --- | ---: | ---: |
| Raízes | 12 | 12 |
| Definições de sufixo | 15 | 20 |
| Acordes raiz + qualidade | 180 | 240 |
| Referências de shapes | 1.498 | 2.033 |
| Duplicatas físicas no mesmo acorde | 12 | 0 |

O total atual contém 1.094 voicings completos, 331 incompletos com raiz, 219
voicings de nona sem raiz, 126 com notas adicionais e 263 que omitem ao menos
um tom essencial.
O relatório mantém essas categorias separadas; uma contagem alta não significa
automaticamente boa cobertura musical.

## Novos símbolos e cobertura

| ID canônico | Apresentação | Raízes com shapes | Estado |
| --- | --- | ---: | --- |
| `7sus4` | `7(4)` | 12/12 | Validado |
| `69` | `6/9` | 12/12 | Validado pela política de tons essenciais |
| `aug` | `+` | 0/12 | Aguarda shapes com fonte conhecida |
| `m9` | `m9` | 12/12 | 8 voicings sem raiz por tom |
| `maj9` | `7M(9)` | 12/12 | 10–11 voicings sem raiz por tom |
| `madd9` | `m(add9)` | 0/12 | Aguarda shapes com fonte conhecida |

As definições sem cobertura existem no domínio e aceitam aliases na entrada,
mas o seletor não as oferece enquanto não houver uma digitação validada. Isso
evita apresentar um acorde sem diagrama ou renomear um shape incompatível.

## Política musical

- Um voicing completo contém todas as notas da fórmula e nenhuma nota externa.
- Um voicing incompleto reutilizável não contém notas externas e preserva os
  tons essenciais da qualidade.
- Em `m9`, os tons essenciais são ♭3, ♭7 e 9; em `maj9`, são 3, 7M e 9.
  A raiz e a quinta podem ser omitidas, com indicação explícita de que o shape
  é recomendado para acompanhamento com baixo ou outro instrumento harmônico.
- Um shape com nota adicional nunca alimenta equivalências automáticas.
- Shapes `dim` e `dim7` com notas adicionais continuam explicitamente ligados
  ao acorde de origem, mas ficam na fila de revisão manual.
- Shapes físicos idênticos são contados uma vez por acorde.
- Novas digitações exigem fonte conhecida; a aplicação não as inventa.

## Dominantes cromáticos

`sus2` agora oferece entre 6 e 7 shapes por raiz, e `m7` oferece entre 9 e 13.
`Db7`, `Eb7`, `Gb7`, `Ab7` e `Bb7` passam a oferecer 11, 9, 10, 9 e 10 formas.
Esses shapes derivam de transposição cromática validada de posições inteiramente
pressionadas; não há cordas soltas convertidas em digitação sem dedo.

Não restam acordes publicados abaixo do limiar de três formas. As famílias
`aug` e `madd9` ainda não possuem shapes compatíveis no corpus conhecido e são
a principal pendência de pesquisa musical.

## Responsabilidade entre repositórios

`chords-db` é a origem dos shapes, fórmulas, aliases e símbolos. O Cavaquinho Lab
fixa uma revisão aprovada, filtra qualidades sem shapes e apresenta o estado do
voicing. Correções de dados devem ser feitas e testadas primeiro no banco; o app
não mantém uma biblioteca paralela em runtime.
