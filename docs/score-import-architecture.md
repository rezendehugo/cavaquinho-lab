# Importação de partituras

## Limite do primeiro lançamento

O fluxo confiável aceita MusicXML de uma única pauta melódica monofônica com cifras. PDF é uma entrada probabilística beta: o worker Audiveris é isolado e licenciado sob AGPL-3.0. Áudio e reconhecimento automático de acordes não fazem parte desta fase.

## Fronteiras

- `apps/api`: API Fastify em TypeScript, contratos Zod, autenticação JWT do Supabase e autorização por proprietário.
- PostgreSQL: importações, rascunhos, jobs, correções auditáveis e exercícios. A migration habilita RLS; a API continua responsável por toda autorização.
- Storage privado: upload assinado e remoção pela API. A chave de serviço nunca chega ao navegador.
- `workers/omr`: processo AGPL separado, sem credenciais de banco, que produz MusicXML para o normalizador.
- React: revisão por medida. Não acessa banco ou storage diretamente.

## Estados e idempotência

`uploaded → queued → processing → draft|needs_correction|failed`, seguido de `draft → ready`. O hash SHA-256 é único por proprietário. Jobs guardam disponibilidade, lock, tentativas e versão do pipeline. Consumidores devem reivindicar jobs com `FOR UPDATE SKIP LOCKED`, timeout e backoff; Redis não é necessário no primeiro ciclo.

## Confiança e revisão

MusicXML recebe confiança 1. O contrato já preserva probabilidades e alternativas para OMR. Erros temporais críticos bloqueiam a prática; avisos de baixa confiança não bloqueiam. Toda alteração usa `revision` otimista e deve gerar um evento de correção. Correções privadas não podem alimentar treinamento sem consentimento explícito e anonimização.

## Segurança operacional

- 20 MB, 20 páginas, 20 importações diárias e cinco jobs ativos por usuário.
- Validar MIME e assinatura, bloquear DTD/entidades XML e limitar profundidade antes do parser.
- Antivírus obrigatório antes de enfileirar PDF.
- CORS restrito e URLs assinadas curtas.
- Logs registram IDs/códigos, nunca conteúdo musical, tokens ou URLs assinadas.
- Exclusão remove fonte, renders, MusicXML, rascunho e derivados.

## Próximos incrementos

1. Executar a migration em um projeto Supabase de homologação e testar políticas de ownership.
2. Implementar claim transacional do worker, antivírus e limite real de páginas.
3. Completar edição estruturada de pitch, duração, cifra, ligadura, compasso e tonalidade.
4. Persistir os artefatos criados e conectá-los às práticas locais.
5. Criar corpus dourado e métricas separadas de raiz, qualidade, ritmo e classes raras.
