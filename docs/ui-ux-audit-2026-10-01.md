# Auditoria de UI/UX — Cavaquinho Lab

Data: 1 de outubro de 2026
Escopo: versão pública em `rezendehugo.github.io/cavaquinho-lab`, desktop e largura de 768 px; leitura do código-fonte correspondente.

## Método e limites

Foram inspecionadas a página inicial, planos, login, Formas, Sequências, Braço, Prática (escala, solo livre e sequência), o diálogo de exercícios e a rota de importação. O diálogo de exercícios foi aberto e fechado com `Esc`. O Braço foi verificado a 768 px: não houve overflow horizontal (`scrollWidth === innerWidth === 768`).

Também foram verificados os atalhos de teclado: `ArrowRight` troca de Escala para Solo livre e de Notas para Escalas no Braço; `?` abre a ajuda de atalhos. O diálogo de exercícios devolve o foco ao botão que o abriu após `Esc`.

Não foram testados: autenticação, checkout, conta, uma importação real de arquivo, exportação de PDF com acordes, histórico de importações e prática focada com uma sequência criada. A publicação atual não habilita autenticação e a sequência inicial não contém acordes.

### Matriz de cobertura

| Superfície | Evidência | Situação |
| --- | --- | --- |
| Início, planos e login | revisão visual na publicação | revisado; login bloqueado por configuração |
| Formas, Sequências, Braço e Prática | revisão visual e interação na publicação | revisado nos estados iniciais |
| Exercícios prontos e ajuda de teclado | abertura/fechamento por teclado na publicação | revisado |
| Importação, conta e exportação | leitura de código; o ambiente público não permite o fluxo completo | parcialmente revisado |
| Termos, privacidade, cancelamento e contato | componente compartilhado e conteúdo revisados no código | parcialmente revisado |

## Resumo executivo

O produto já comunica uma visão forte de prática deliberada: intenção, execução, escuta e reflexão. O principal problema não é a qualidade das ideias, mas sua simultaneidade. Em estados iniciais, o aluno recebe muitas ferramentas, cartões, legendas e ações desabilitadas antes de ter material para praticar.

A direção recomendada é **progressive disclosure**: uma ação evidente por etapa, com teoria, exportação, reflexão e controles avançados revelados quando a prática passa a precisar deles.

## Achados priorizados

### P0 — rota de importação não mantém a intenção do usuário

**Evidência.** Na publicação, `/imports` exibe o painel de prática de sequência. Não há a aba Partitura nem explicação de que a importação está desativada. O roteamento seleciona `PracticePage initialMode="score"` em `src/App.jsx`; quando `scoreImportsEnabled` é falso, `PracticePage` renderiza sequência para qualquer modo que não seja escala ou solo.

**Impacto.** Um link, favorito ou CTA para importar partitura leva a uma atividade diferente. É uma quebra de confiança, especialmente para a proposta de criar material de estudo a partir de uma música.

**Mudança recomendada.** Quando a importação estiver desabilitada, a rota deve mostrar uma tela própria com: "Importação de partitura ainda não está disponível nesta versão", um motivo breve e uma ação útil como "Criar sequência manualmente". Não deve abrir uma prática que não foi solicitada.

**Aceite.** Em ambiente com importação desativada, `/imports` apresenta essa mensagem e uma ação para `/sequences`; em ambiente habilitado, abre o fluxo de upload.

### P0 — a versão publicada não permite entrada do aluno

**Evidência.** A página `/login` mostra "Autenticação ainda não foi configurada neste ambiente" em vez dos métodos de entrada.

**Impacto.** O valor de salvar sequências, continuar em outro dispositivo e usar plano Pro é interrompido no primeiro passo.

**Mudança recomendada.** Antes de divulgar a página como produto utilizável, habilitar a autenticação no ambiente publicado. Enquanto isso não acontecer, trocar o CTA por uma lista de espera ou informar claramente que é uma prévia.

**Aceite.** O CTA "Começar agora" termina em uma entrada funcional ou em uma tela honesta de prévia; não em uma falha de configuração.

### P1 — páginas legais declaram que não estão prontas para venda

**Evidência.** A mesma aplicação que expõe planos e checkout mostra, em todas as páginas legais: "Este texto deve passar por revisão jurídica antes da venda pública" (`src/pages/LegalPage.jsx`).

**Impacto.** A mensagem reduz confiança exatamente quando o aluno avalia uma assinatura e aponta para uma lacuna de prontidão comercial.

**Mudança recomendada.** Antes de expor compra, concluir a revisão jurídica e publicar textos finalizados; até então, apresentar o produto como beta sem checkout público.

**Aceite.** Uma página comercial não contém aviso de que seus termos ainda não servem para venda pública.

### P1 — Sequências apresenta o processo inteiro antes do primeiro acorde

**Evidência.** No estado vazio, a tela expõe intenção, exportação, legenda de voicings, filme de acordes, perguntas de reflexão e análise harmônica. Baixar PDF, durações, iniciar prática e registrar sessão estão desabilitados.

**Impacto.** A mensagem pedagógica é boa, mas o aluno iniciante precisa procurar a ação que libera o restante: "Adicionar acorde".

**Mudança recomendada.** Estruturar a tela como uma sequência de estados:

1. Estado vazio: intenção opcional, exercícios prontos e uma ação dominante "Adicionar primeiro acorde".
2. Com acordes: montagem, troca de formas e exportação.
3. Depois de praticar: reflexão, perguntas e registro de sessão.

**Aceite.** Com zero acordes, só existe uma ação primária de construção. Ao criar o primeiro acorde, os controles de prática e exportação surgem com explicação de disponibilidade.

### P1 — o Braço repete o estado selecionado e reduz o espaço do instrumento

**Evidência.** A mesma seleção aparece no seletor, no cartão de resumo, no botão Limpar e em uma legenda genérica. A estrutura está concentrada em `src/pages/FretboardPage.jsx`.

**Impacto.** O aluno olha para a interface antes de olhar para o braço. A repetição é ainda mais visível quando uma nota como D♭/C♯ é escolhida.

**Mudança recomendada.** Unir modo, seletor e resumo num bloco compacto: `Explorando: D♭ / C♯ · 4 posições`. Tornar Limpar uma ação discreta no próprio bloco e mostrar a legenda apenas quando houver cor ou estado que ela explique.

**Aceite.** Para uma nota selecionada, o nome e a enarmonia aparecem uma vez no painel de controle; o braço ocupa a maior parte do espaço visual.

### P1 — Prática mistura configuração, criação e execução

**Evidência.** Em Escala e Solo livre, muitos controles precedem a primeira ação possível. Botões desabilitados mantêm a aparência verde de ação principal.

**Impacto.** Parece que algo está quebrado, em vez de comunicar o pré-requisito para iniciar.

**Mudança recomendada.** Apresentar um pequeno roteiro visível: `1. Escolha as notas` → `2. Revise o caminho` → `3. Pratique`. Ocultar ou usar estilo neutro para ações indisponíveis; manter uma instrução diretamente acima do próximo controle necessário.

**Aceite.** Em Solo livre vazio, a primeira ação indicada é selecionar uma nota no braço. Em Escala vazia, a primeira ação indicada é escolher início e fim. Botões indisponíveis não parecem clicáveis.

### P1 — Formas trata todas as posições como equivalentes

**Evidência.** C maior abre com sete cartões visualmente semelhantes, todos com diagrama, numeração, digitação e botão "Estudar".

**Impacto.** O aluno precisa comparar sete opções sem um critério inicial de escolha.

**Mudança recomendada.** Exibir uma forma recomendada como card principal, com critérios explícitos (região, facilidade de troca, cordas abertas). Deixar outras opções em uma faixa comparável e abrir a comparação detalhada sob demanda.

**Aceite.** A tela permite escolher uma forma em poucos segundos e explica por que ela é adequada; as demais continuam acessíveis para exploração.

### P1 — exportação de PDF precisa de uma prova visual de fidelidade

**Evidência.** O aluno relatou que o PDF exportado mostra indicadores de dedos e formas incorretas quando comparado à tela. Não foi possível reproduzir porque a sequência pública começa sem acordes; o código delega a geração ao módulo `domain/sequencePdf`.

**Impacto.** O PDF é o artefato de estudo para tablet e impressão. Se ele difere da forma escolhida, perde a função de mapa confiável para tocar.

**Mudança recomendada.** Criar uma sequência-fixture com formas conhecidas e um teste de comparação visual entre o card mostrado e o PDF. O modo "Mapa para tocar" deve reproduzir a forma, cordas abafadas/soltas, base de casa e cores relevantes — sem indicadores de dedos quando a tela não os mostra.

**Aceite.** Para a fixture, a prévia e o PDF exportado têm as mesmas posições de corda/casa e os mesmos elementos visuais permitidos. A prova inclui capturas lado a lado em largura de tablet.

### P2 — padrões de navegação e seleção são duplicados

**Evidência.** Navegação global, Braço, Prática, folha TAB e revisão de partitura usam variações próprias de abas/segmentos.

**Impacto.** Espaçamento, estados ativos e comportamento adaptativo podem divergir, enfraquecendo a sensação de sistema único.

**Mudança recomendada.** Criar um componente de segmentação com variantes `navigation`, `compact` e `content`, todos baseados nos mesmos tokens de altura, contraste, foco e espaçamento.

**Aceite.** Os quatro contextos usam o mesmo estado de foco, borda, raio e comportamento de teclado, com diferenças apenas de densidade justificadas.

### P2 — planos e vocabulário reduzem clareza comercial e pedagógica

**Evidência.** Pro mostra "Preço no checkout" e botões apenas "Mensal" e "Anual". Em áreas de estudo, aparecem termos internos como "voicing" sem apoio contextual.

**Impacto.** O aluno não sabe o custo antes de iniciar compra e pode não entender por que um acorde é marcado de determinada maneira.

**Mudança recomendada.** Exibir preço e período no plano, ou explicar a variação. Traduzir termos técnicos para linguagem musical em português, mantendo o termo original em ajuda contextual quando necessário.

**Aceite.** O plano pode ser comparado sem checkout; cada estado de acorde tem uma explicação em linguagem de estudante.

## Evidência positiva a preservar

- A arquitetura de Sequências respeita prática deliberada e valoriza reflexão em vez de apenas repetição.
- O diálogo de exercícios tem hierarquia, prévia harmônica e fechamento por `Esc`.
- Notas e enarmonias do Braço estão descritas de forma acessível.
- Tabs de Prática e Braço respondem às setas do teclado; `?` torna os atalhos consultáveis.
- A largura de 768 px não causou overflow horizontal no Braço.
- A prática em modo solo permite construir um percurso musical livre em vez de limitar o aluno a um exercício fechado.

## Ordem proposta de entrega

1. Corrigir o contrato da rota `/imports` e o estado público de autenticação.
2. Refatorar o estado vazio de Sequências e a disponibilidade de ações de Prática.
3. Compactar o Braço e introduzir o padrão único de abas.
4. Reorganizar o explorador de Formas em torno de decisão e comparação.
5. Validar PDF, importação, login, checkout e prática focada em fluxos completos.
