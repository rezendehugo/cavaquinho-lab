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

## HML e CI/CD — configuração pendente de identidade

O repositório já tem um workflow manual `Production` que pede `staging` ou `production`, mas não existem projetos/variáveis de HML verificáveis. Para não apontar um deploy a produção por engano, o workflow de HML e a proteção de `main` só devem ser aplicados após confirmar estes destinos:

| Item | Valor a confirmar |
| --- | --- |
| GitHub Environment | nome final (`hml` ou `staging`) e aprovadores/regras de proteção |
| Frontend | projeto Cloudflare Pages, branch de preview e URL de HML |
| API | app Fly.io de HML e URL de readiness |
| Dados e autenticação | projetos Supabase/Stripe/Sentry de HML, redirects e retenção de dados |
| Segredos | onde serão cadastrados `FLY_API_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` e variáveis públicas; nenhum valor será versionado |

Depois da confirmação, a mudança será feita em duas etapas reversíveis:

1. Criar o environment GitHub `hml`, com acesso apenas ao ramo `codex/enharmonic-hml-delivery` inicialmente, e adicionar o workflow que roda CI, publica preview de frontend, implanta a API de HML e consulta `/api/ready`.
2. Exigir o check de deploy/smoke de HML para PRs e merges em `main`. O rollback é remover esse check da proteção de `main` e promover o deployment anterior no Cloudflare/Fly; nenhuma migration destrutiva será incluída.

## Critérios de aceite

- A lista de Formas deixa claro que `C#` e `Db` levam às mesmas digitações.
- Ao registrar `C#`, a sequência, os diagramas, a acessibilidade e o PDF mantêm `C#` (incluindo `E#` como terça maior), enquanto a seleção de formas segue funcionando.
- “Completo” não tem a mesma cor do grau 5, e ambos têm texto acessível.
- Os checks de unidade, lint, tipos e navegador passam antes de abrir merge.
- Após a identidade da HML ser confirmada, cada PR para `main` recebe uma implantação verificável de HML e só pode ser mesclado quando o check correspondente passar.
