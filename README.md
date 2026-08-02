# Cavaquinho Lab

Aplicativo educacional para estudar cavaquinho por meio de formas de acordes, sequências, análise harmônica, cores de apoio e visualização do braço do instrumento.

## Requisitos

- Node.js 22
- npm 11

O repositório inclui `.nvmrc` e declara as versões suportadas em `package.json`.

## Instalação e desenvolvimento

Em um clone novo:

```bash
nvm use
npm ci
npm run dev
```

Abra `http://127.0.0.1:5173/cavaquinho-lab/`.

Use `npm install` somente ao alterar dependências. Para instalações reproduzíveis e para CI, use `npm ci`.

## Comandos

```bash
npm run dev        # servidor local com recarregamento
npm run audit:ui   # contrato de textos e botões da interface
npm run lint       # análise estática
npm run typecheck  # baseline TypeScript para JS/JSX
npm test           # testes Vitest em jsdom
npm run build      # build de produção em dist/
npm run preview    # prévia local do build
npm run check      # lint, typecheck e testes
npm run validate   # todas as verificações e build
npm run test:e2e   # abre o app e executa os testes Cypress
npm run test:e2e:open # abre o Cypress interativo para aprender e depurar
npm run dev:api      # API local de importação em 127.0.0.1:8080
npm run test:api     # contratos, ownership e normalização MusicXML
```

## Docker

Para iniciar a aplicação completa, incluindo importação de PDF:

```bash
npm run stack:up
```

Abra `http://127.0.0.1:5173/cavaquinho-lab/`. O Compose aguarda PostgreSQL,
worker OMR e API ficarem saudáveis antes de iniciar a interface. React/CSS,
API TypeScript e os arquivos de produção do worker Python usam hot reload.
Alterações em dependências, Dockerfiles, Audiveris ou tessdata ainda exigem
rebuild.

Comandos operacionais:

```bash
npm run stack:status # estado e healthchecks
npm run stack:logs   # logs do frontend, API e worker
npm run stack:rebuild # reconstrói imagens e dependências
npm run stack:down   # encerra a pilha; o banco local é preservado
```

Os perfis isolados continuam disponíveis:

```bash
docker compose --profile ci up --build --abort-on-container-exit
docker compose --profile preview up --build
```

Se a tela mostrar `api_unavailable`, confirme que `api`, `omr-worker` e
`postgres` aparecem como saudáveis em `npm run stack:status`.

### Publicar na rede privada Tailscale

O Tailscale Serve disponibiliza a aplicação somente para dispositivos
autorizados na mesma tailnet. Primeiro descubra o nome HTTPS desta máquina:

```bash
tailscale status
tailscale serve status
```

Defina a origem HTTPS exibida pelo Tailscale, recrie apenas os processos que
consomem essa configuração e publique a interface e as rotas da API:

```bash
export CAVAQUINHO_TAILSCALE_URL="https://nome-da-maquina.exemplo.ts.net"

VITE_API_URL="$CAVAQUINHO_TAILSCALE_URL" \
VITE_ALLOWED_HOSTS="nome-da-maquina.exemplo.ts.net" \
CORS_ALLOWED_ORIGINS="http://127.0.0.1:5173,http://localhost:5173,$CAVAQUINHO_TAILSCALE_URL" \
PUBLIC_API_URL="$CAVAQUINHO_TAILSCALE_URL" \
docker compose --profile dev --profile backend up --detach --force-recreate dev api

tailscale serve reset
tailscale serve --bg 5173
tailscale serve --bg --set-path /api http://127.0.0.1:8080/api
tailscale serve --bg --set-path /v1 http://127.0.0.1:8080/v1
tailscale serve status
```

Abra a URL HTTPS em outro dispositivo conectado à tailnet. `/` encaminha para
o Vite, enquanto `/api` e `/v1` permanecem na mesma origem e chegam à API.
Uploads e banco continuam nos volumes Docker locais. `tailscale serve reset`
remove a configuração Serve anterior desta máquina; execute-o apenas quando
quiser substituir o proxy existente.

Para retirar a publicação privada sem desligar os containers:

```bash
tailscale serve reset
```

## Configuração de ambiente

Sem Supabase configurado, o desenvolvimento usa uma conta local e mantém o editor no navegador. O modo de produção exige as variáveis documentadas em `.env.example` para Auth, API, Stripe e observabilidade.

Variáveis com prefixo `VITE_` são incorporadas ao bundle e ficam públicas no navegador. Nunca armazene tokens, senhas ou outras credenciais nelas.

## Arquitetura e persistência

- React e Vite compõem a interface; contas, sequências e cobrança usam uma API Fastify separada.
- Componentes visuais ficam em `src/components` e páginas em `src/pages`.
- Regras determinísticas de acordes e braço ficam em `src/domain` e módulos de domínio relacionados em `src/`.
- PostgreSQL é a fonte de verdade para sequências autenticadas. O `localStorage` permanece como cópia recuperável e é migrado uma única vez após o primeiro login.
- A base de acordes vem de uma dependência fixada por commit.

## Testes e acessibilidade

Os testes unitários cobrem parsing de acordes, normalização, sequências,
harmonia, diagramas e interações principais. O Cypress cobre contratos que
dependem do navegador real, incluindo alinhamento e duplicação de textos
estáticos em todas as rotas e modos. Botões iconográficos precisam de nome
acessível e tooltip; textos longos exigem uma justificativa controlada.

O hook de pre-commit executa `npm run audit:ui`. O CI repete a auditoria e a
matriz Cypress em pushes de qualquer branch e em pull requests.

Para acompanhar um teste no navegador e inspecionar cada comando:

```bash
npm run test:e2e:open
```

Escolha `E2E Testing`, selecione Chrome e abra `chord-identity.cy.js`. Para uma execução automática, como no CI, use `npm run test:e2e`.

O teste de alinhamento não depende apenas de uma captura de tela: ele mede as caixas renderizadas da nota e do sufixo, confirma que permanecem unidos e verifica que o símbolo completo continua centralizado. A captura gerada ajuda na revisão humana; comparação automática pixel a pixel pode ser adicionada depois, quando houver baselines estáveis por navegador.

Antes de enviar alterações, execute:

```bash
npm run validate
```

A interface usa controles semânticos, rótulos acessíveis e fluxos de teclado. Verificações automatizadas com axe, testes ponta a ponta e regressão visual ainda fazem parte do roadmap.

## Publicação

### SaaS de produção

A topologia recomendada usa Cloudflare Pages para o frontend, Fly.io para a API e Supabase para Auth/PostgreSQL. Stripe fornece Checkout, Portal e webhooks. O worker Audiveris fica desabilitado no primeiro lançamento para não afetar custo e confiabilidade do fluxo Formas → Sequências → Prática.

1. Crie projetos Supabase separados para staging e produção e aplique `apps/api/migrations`.
2. Configure magic link, Google OAuth e os redirects oficiais.
3. Crie os preços mensal e anual no Stripe e configure o webhook `/v1/webhooks/stripe`.
4. Configure no Fly os secrets de banco, Supabase, Stripe, Sentry e OTLP.
5. Configure os environments `staging` e `production` no GitHub, com aprovação obrigatória para produção.
6. Execute manualmente o workflow `Production`, valide staging e promova o mesmo commit.

O deploy público usa `VITE_ENABLE_SCORE_IMPORTS=false`. O healthcheck da API é `/api/ready`; rollback, SLOs e resposta a incidentes estão em [arquitetura de produção](docs/production-architecture.md).

Variáveis `VITE_` são públicas. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e tokens de observabilidade pertencem somente à API ou ao GitHub Actions.

### GitHub Pages legado

O workflow de GitHub Pages valida lint, tipos, testes e build antes de publicar `dist/` em:

https://rezendehugo.github.io/cavaquinho-lab/

O fallback `404.html` permite abrir diretamente as rotas da aplicação no GitHub Pages.

GitHub Pages publica somente a interface. Para habilitar **Partitura** em
produção, publique API, PostgreSQL/storage privado e worker separadamente e
configure a variável de repositório `VITE_API_URL` com a URL HTTPS pública da
API antes do build. Não use `localhost`, URLs privadas ou segredos nessa
variável.

Consulte [arquitetura e deploy da importação](docs/score-import-architecture.md)
para topologia, comandos, healthchecks e requisitos de segurança.

## Limitações e roadmap

- Sem Supabase configurado, os dados continuam restritos ao navegador.
- PDF/OMR permanece beta e fora do SLO do produto principal; produção começa com essa interface desabilitada.
- O typecheck é uma baseline incremental para JS/JSX; `checkJs` estrito será habilitado por módulo.
- Persistência versionada, reordenação acessível por teclado, testes axe e Playwright estão planejados.

Consulte `CONTRIBUTING.md` para colaborar e `SECURITY.md` para relatar vulnerabilidades.

Detalhes do modelo de confiança, licenças e operação estão em [docs/score-import-architecture.md](docs/score-import-architecture.md).

## Contribuidores

Desenvolvido e mantido por [Hugo Rezende](https://github.com/rezendehugo), com assistência de desenvolvimento do [OpenAI Codex](https://openai.com/codex/).

## Licença

Distribuído sob a licença MIT. Consulte `LICENSE`.
