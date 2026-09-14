# Arquitetura de produção

## Produto principal

O caminho crítico é `Formas → Sequências → Prática`. A biblioteca de acordes é imutável e versionada no build. PostgreSQL é a fonte de verdade para contas, sequências, ocorrências e assinaturas. O importador OMR não participa do SLO do produto principal.

## Serviços

- Cloudflare Pages: frontend React, builds imutáveis e rollback por deployment.
- Fly.io: API Fastify em São Paulo, com `/api/health` e `/api/ready`.
- Supabase: Auth, PostgreSQL e backups.
- Stripe: Checkout, Portal e webhooks assinados.
- Sentry: exceções do navegador e da API.
- Grafana Cloud: logs e traces OpenTelemetry.

O custo inicial esperado fica abaixo de US$25/mês mantendo a API com auto-stop e o worker Audiveris desativado.

## Consistência e resiliência

- Ownership é aplicado em todas as queries.
- Escritas de sequência usam revisão otimista e retornam `409 revision_conflict`.
- A migração local possui marcador persistido e IDs estáveis.
- Webhooks Stripe são idempotentes por ID do evento.
- O frontend mantém a cópia local até a API confirmar a sincronização.
- Mudanças de schema devem ser compatíveis com a versão anterior durante um deploy.

## SLO e alertas

- Disponibilidade mensal: 99,5%.
- p95 leitura: 500 ms; p95 escrita: 800 ms.
- Erros não tratados: menos de 1% das sessões.
- Perda silenciosa de escrita confirmada: zero.

Alertar por indisponibilidade, crescimento de erros, latência sustentada, conflitos de revisão e falhas de webhook. Logs incluem `requestId`, versão e ambiente, mas nunca tokens ou conteúdo musical completo.

## Deploy

1. Criar projetos Supabase separados para staging e produção.
2. Aplicar migrations na ordem numérica.
3. Configurar Auth magic link e Google OAuth com redirects oficiais.
4. Criar produto e preços mensal/anual no Stripe.
5. Configurar secrets no Fly e os environments do GitHub. Cada environment define `FLY_APP_NAME` e `CLOUDFLARE_PROJECT_NAME`, evitando que staging e produção compartilhem aplicações.
6. Criar projeto Cloudflare Pages `cavaquinho-lab`.
7. Executar o workflow `Production` para staging.
8. Rodar smoke tests e promover o mesmo SHA para production.

## Rollback e incidentes

- Frontend: promover o deployment Cloudflare anterior.
- API: `fly releases` e `fly deploy --image` com a imagem anterior.
- Banco: nunca depender de rollback destrutivo; corrigir com migration forward.
- Em incidente de billing, desabilitar checkout, preservar entitlements existentes e reprocessar webhooks pelo ID.
- Em falha de sincronização, não apagar a cópia local do navegador.
