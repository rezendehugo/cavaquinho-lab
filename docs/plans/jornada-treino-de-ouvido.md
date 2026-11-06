# Jornada de ouvido e prática sem olhar

## Objetivo

Levar a pessoa de uma tentativa de memória numa sequência conhecida até ouvir funções, antecipar resoluções, reconhecer centros tonais e tocar a mesma harmonia em outra tonalidade. A partitura e os diagramas continuam como apoio de conferência; a jornada cria ocasiões seguras para tentar antes de consultá-los.

## Evidências e decisões de aprendizagem

- O benchmark de [EarPrep](https://earprep.com/functional-ear-trainer/) estabelece um centro tonal com cadência, acrescenta graus em etapas e só depois pergunta a função de acordes. A trilha do Cavaquinho Lab segue essa ordem, com exemplos tocáveis no instrumento.
- [ToneGym](https://www.tonegym.co/games/index?aff=8001&lp=sightreading) separa reconhecimento de acordes, escalas, memória e progressões em exercícios curtos com respostas de múltipla escolha. O Lab usa rodadas breves e reprodução repetível, sem placar competitivo ou limite de tempo.
- Woody estudou 28 estudantes universitários de música aprendendo melodias de ouvido, com ou sem um mapa de acordes; o mapa ajudou participantes no meio da faixa de experiência, mas não todos. Isso apoia a revelação depois da tentativa e o uso opcional de pistas, não a retirada permanente da partitura ([artigo](https://journals.sagepub.com/doi/10.1177/0305735618816365)).
- Um estudo de retenção de canções encontrou benefício para prática espaçada em sessões ([Katz, Ando e Wiseheart, 2021](https://link.springer.com/article/10.1186/s41235-021-00345-7)). O próximo ciclo deve reintroduzir exercícios em dias posteriores; a evidência estudou memória de canções, não uma trilha específica de harmonia para cavaquinho.
- Estudos sobre aprendizagem de harmonia mostram que ouvintes usam regularidades nas transições de acordes para formar expectativas ([Jonaitis e Saffran, 2009](https://onlinelibrary.wiley.com/doi/full/10.1111/j.1551-6709.2009.01036.x)). Isso fundamenta exercícios de antecipar resoluções, sem assumir que uma sequência seja a única leitura correta em todo estilo.

## Jornada e estado atual

1. **Praticar sem olhar — entregue:** usar uma sequência salva, ocultar cifras e diagramas, tocar de memória, pedir pistas, revelar e registrar uma reflexão local.
2. **Sentir o modo — entregue:** ouvir I–IV–V7–I ou i–iv–V7–i e escolher maior ou menor.
3. **Encontrar o centro tonal — entregue:** ouvir a cadência, escolher a nota de repouso entre alternativas e cantar/localizar essa nota no cavaquinho.
4. **Reconhecer caminhos — entregue:** distinguir ii–V7–I, I–vi–ii–V7 e I–IV–V7–I em tonalidades variadas.
5. **Antecipar a resolução — entregue:** ouvir ii–V7 e prever a função que completa a cadência.
6. **Ouvir transposição — entregue:** comparar duas execuções da mesma progressão e identificar deslocamentos de −2, −1, 0, +1 ou +2 semitons.
7. **Antecipar a própria sequência — entregue:** selecionar uma sequência salva, ouvir o contexto até a troca escondida, escolher o próximo acorde entre os acordes daquela sequência e só então ouvir a resolução completa. A reflexão pede que a pessoa toque a passagem no cavaquinho.
8. **Revisão espaçada — primeira versão entregue:** registrar tentativas por sequência neste navegador. Uma resposta errada fica para 10 minutos; acertos seguidos espaçam a revisão para 1 dia e depois 7 dias. O painel mostra quantas sequências estão vencidas; a pessoa pode continuar qualquer sequência sem bloqueio.
9. **Próximo ciclo — pendente:** ampliar padrões depois de revisão musical e pesquisa com usuários; avaliar timbre gravado de cavaquinho contra o sintetizador atual; estudar a qualidade da seleção de intervalos e recomendações de revisão com praticantes.

## Interface e dados

- A aba **Ouvido** vive em Prática e apresenta a trilha em cartões escolhidos pela pessoa. Cada rodada permite repetir o trecho, responder sem cronômetro, receber explicação harmônica e iniciar outra.
- O áudio deriva de formas disponíveis no banco de cavaquinho e usa otimização de condução de vozes. O sintetizador triangular é uma referência auditiva simples, não uma gravação real do instrumento.
- A trilha sugere a primeira etapa com menos de três tentativas ou menos de dois terços de acerto; depois de três tentativas e ao menos dois terços de acerto, sugere a etapa seguinte. A pessoa pode escolher qualquer etapa a qualquer momento.
- Acertos, tentativas e melhor sequência ficam no `localStorage` do navegador. Revisões das sequências salvas também ficam locais, separadas dos dados da sequência. Nenhum áudio, resposta ou dado de progresso é transmitido ou sincronizado nesta versão.
- As alternativas e feedbacks devem continuar claros sem cor, operar por teclado e caber em telas estreitas e zoom ampliado.

## Medidas de sucesso e avaliação

- **Aprendizagem por etapa:** acerto em exercícios novos, em mais de uma tonalidade, com indicação separada de tentativas e uso de pistas. Não promover automaticamente alguém com base numa única rodada.
- **Transferência:** em sessões de teste, pedir que a pessoa cante a tônica ou toque a sequência no cavaquinho antes da revelação; registrar conclusão e percepção de confiança sem pontuar qualidade de execução não observada.
- **Retenção:** revisitar atividades após intervalos de 10 minutos (recuperação após erro), um dia e uma semana; comparar acertos sem pistas, preservando os dados localmente. Os intervalos iniciais são uma regra de produto para validar, não uma agenda individual cientificamente calibrada.
- **Fluxo e acessibilidade:** observar conclusão voluntária de rodadas curtas, repetição de áudio, desistências, uso de teclado, compreensão do feedback e comportamento a 390 px e zoom 200% em avaliação de produto. Esses sinais servem para revisão, não para presumir melhora auditiva sem estudo com participantes.

## Verificação da implementação

- Cobrir geração determinística de cada nível, transições harmônicas, tonalidades/transposições válidas, notas MIDI, progresso inválido, feedback correto/incorreto e armazenamento local.
- No navegador, conferir reprodução real, bloqueio de resposta durante o áudio, repetição, passagem entre níveis, largura sem overflow em 390 px e navegação por teclado.
- Testar exemplos conhecidos de C maior e A menor, ii–V7–I em mais de uma tonalidade e transposição de um tom e semitom; conferir que a forma tocada corresponde às notas musicais geradas.
