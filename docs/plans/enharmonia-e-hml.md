# Enarmonia explícita e gate de HML

Relacionada à issue #70.

## Evidências

- Em `Formas`, a biblioteca expõe apenas as chaves canônicas com bemol. Assim, a pessoa que procura `C#` não vê que deve selecionar `Db`.
- A sequência já aceitava `C#`, mas a análise e o diagrama recebiam a chave canônica `Db`; isso fazia uma tríade de C# ser ensinada com a grafia de Db.
- O estado `Voicing completo` e o grau 5 usavam cinzas próximos (`#748087` e `#5f6b76`), tornando os dois marcadores fáceis de confundir na captura fornecida.
- A proteção atual de `main` exige somente o check `validate`. Existe apenas o environment `github-pages`; não há environment nem variáveis de HML configurados.

## Entrega deste ramo

1. Mostrar as opções acidentadas de Formas como `C#/Db`, `D#/Eb`, `F#/Gb`, `G#/Ab` e `A#/Bb`, sem duplicar a biblioteca de digitações.
2. Preservar a grafia digitada nas Sequências. A busca física continua por classe de altura, mas fórmula, diagrama, acessibilidade e PDF usam, por exemplo, `C#–E#–G#` quando a pessoa escreveu `C#`.
3. Tornar `Completo` verde semântico, reservado ao estado da forma, e manter o grau 5 cinza. A legenda textual continua disponível para que a cor não seja a única pista.
4. Cobrir a entrada `C#`, a grafia da tríade e o rótulo `C#/Db` em testes unitários e de navegador.

## HML e CI/CD — fluxo de branches

HML é um estágio de código, não uma infraestrutura separada. O GitHub Pages público serve a release candidate (RC) construída da branch `hml`.

```text
branch de trabalho ──PR + CI──> hml ──Pages RC + validação humana──> PR de hml para main ──> produção
```

1. A branch `hml` nasce de `main` e recebe somente PRs com o check `validate` aprovado.
2. Todo push em `hml` executa o workflow de Pages e publica a RC no endereço público do projeto, identificada por `VITE_APP_VERSION=hml-<sha>`.
3. A pessoa responsável valida a RC pública e abre ou aprova o PR `hml → main` para pedir a promoção.
4. O check obrigatório `HML release candidate / hml-gate` reprova qualquer PR para `main` cuja origem não seja `hml`. `main` também continua exigindo `validate` e resolução de conversas.

O rollback é reverter ou corrigir em `hml`, o que gera uma nova RC no mesmo Pages; a promoção para `main` permanece bloqueada até que os checks passem. Não há novas credenciais, serviços, segredos ou migrations neste fluxo.

## Critérios de aceite

- A lista de Formas deixa claro que `C#` e `Db` levam às mesmas digitações.
- Ao registrar `C#`, a sequência, os diagramas, a acessibilidade e o PDF mantêm `C#` (incluindo `E#` como terça maior), enquanto a seleção de formas segue funcionando.
- “Completo” não tem a mesma cor do grau 5, e ambos têm texto acessível.
- Os checks de unidade, lint, tipos e navegador passam antes de abrir merge.
- Cada push em `hml` publica uma RC verificável; `main` só aceita o PR de promoção vindo de `hml`, com todos os checks aprovados.
