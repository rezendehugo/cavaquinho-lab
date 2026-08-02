# Auditoria da biblioteca de acordes

Inventário reproduzível da revisão de `chords-db` fixada no `package-lock.json`:

```bash
npm run audit:chords
```

## Resultado atual

| Métrica | Antes do ciclo | Depois do ciclo |
| --- | ---: | ---: |
| Raízes | 12 | 12 |
| Definições de sufixo | 20 | 21 |
| Acordes raiz + qualidade | 240 | 252 |
| Referências de shapes | 2.033 | 2.087 |
| Duplicatas físicas no mesmo acorde | 12 | 0 |

O total atual contém 1.283 voicings completos, 403 incompletos válidos e 401
voicings sem raiz. Não há shapes publicados com notas adicionais ou ausência de
tom característico. Dos voicings sem raiz, 312 pertencem às extensões `9`, `m9`
e `maj9`; os outros 89 são formas de acompanhamento reclassificadas.
O relatório mantém essas categorias separadas; uma contagem alta não significa
automaticamente boa cobertura musical.

## Novos símbolos e cobertura

| ID canônico | Apresentação | Raízes com shapes | Estado |
| --- | --- | ---: | --- |
| `7sus4` | `7(4)` | 12/12 | Validado |
| `69` | `6/9` | 12/12 | Validado pela política de tons essenciais |
| `aug` | `+` | 12/12 | 6 formas validadas por tom |
| `m9` | `m9` | 12/12 | 8 voicings sem raiz por tom |
| `maj9` | `7M(9)` | 12/12 | 10–11 voicings sem raiz por tom |
| `madd9` | `m(add9)` | 12/12 | 6 formas validadas por tom |
| `mmaj7` | `m(7M)` | 12/12 | 6 formas validadas por tom |

As três novas qualidades foram geradas na afinação D–G–B–D e validadas por
fórmula, abertura máxima de quatro casas, três ou quatro cordas tocadas e limite
de quatro dedos. O seletor continua ocultando qualquer qualidade sem diagrama.

## Política musical

- Um voicing completo contém todas as notas da fórmula e nenhuma nota externa.
- Um voicing incompleto reutilizável não contém notas externas e preserva os
  tons essenciais da qualidade.
- Em `m9`, os tons essenciais são ♭3, ♭7 e 9; em `maj9`, são 3, 7M e 9.
  A raiz e a quinta podem ser omitidas, com indicação explícita de que o shape
  é recomendado para acompanhamento com baixo ou outro instrumento harmônico.
- Um shape com nota adicional nunca alimenta equivalências automáticas.
- Shapes `dim` que continham a sétima diminuta foram movidos para `dim7`.
- Um `dim7` com uma única omissão permanece disponível como incompleto.
- Shapes sem terça ou outro tom característico ficam somente no relatório de
  revisão e não aparecem nos seletores.
- Shapes físicos idênticos são contados uma vez por acorde.
- Formas geradas são identificadas na origem e passam pelos mesmos contratos
  determinísticos antes de serem publicadas.

## Dominantes cromáticos

`sus2` agora oferece entre 6 e 7 shapes por raiz, e `m7` oferece entre 9 e 13.
`Db7`, `Eb7`, `Gb7`, `Ab7` e `Bb7` oferecem 11, 8, 10, 9 e 10 formas.
Esses shapes derivam de transposição cromática validada de posições inteiramente
pressionadas; não há cordas soltas convertidas em digitação sem dedo.

As tríades `dim` agora possuem uma forma exata por tom; expandir sua cobertura
ergonômica é a principal pendência residual, sem reaproveitar shapes `dim7` como
se fossem tríades diminutas.

## Responsabilidade entre repositórios

`chords-db` é a origem dos shapes, fórmulas, aliases e símbolos. O Cavaquinho Lab
fixa uma revisão aprovada, filtra qualidades sem shapes e apresenta o estado do
voicing. Correções de dados devem ser feitas e testadas primeiro no banco; o app
não mantém uma biblioteca paralela em runtime.
