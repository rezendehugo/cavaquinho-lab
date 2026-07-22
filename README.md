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
npm run lint       # análise estática
npm run typecheck  # baseline TypeScript para JS/JSX
npm test           # testes Vitest em jsdom
npm run build      # build de produção em dist/
npm run preview    # prévia local do build
npm run check      # lint, typecheck e testes
npm run validate   # todas as verificações e build
npm run test:e2e   # abre o app e executa os testes Cypress
npm run test:e2e:open # abre o Cypress interativo para aprender e depurar
```

## Docker

```bash
docker compose --profile dev up --build
docker compose --profile ci up --build --abort-on-container-exit
docker compose --profile preview up --build
```

Os perfis expõem, respectivamente, as portas `5173` e `4173`.

## Configuração de ambiente

O aplicativo não exige variáveis de ambiente atualmente. Consulte `.env.example` antes de adicionar configuração local.

Variáveis com prefixo `VITE_` são incorporadas ao bundle e ficam públicas no navegador. Nunca armazene tokens, senhas ou outras credenciais nelas.

## Arquitetura e persistência

- React e Vite compõem a interface estática.
- Componentes visuais ficam em `src/components` e páginas em `src/pages`.
- Regras determinísticas de acordes e braço ficam em `src/domain` e módulos de domínio relacionados em `src/`.
- Sequências são armazenadas somente no `localStorage` do navegador; não existe conta, servidor ou sincronização em nuvem.
- A base de acordes vem de uma dependência fixada por commit.

## Testes e acessibilidade

Os testes unitários cobrem parsing de acordes, normalização, sequências, harmonia, diagramas e interações principais. O Cypress cobre contratos que dependem do navegador real, incluindo alinhamento visual dos nomes dos acordes.

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

O workflow de GitHub Pages valida lint, tipos, testes e build antes de publicar `dist/` em:

https://rezendehugo.github.io/cavaquinho-lab/

O fallback `404.html` permite abrir diretamente as rotas da aplicação no GitHub Pages.

## Limitações e roadmap

- Os dados ficam restritos ao navegador e podem ser apagados pelo usuário.
- Não há autenticação, backend ou sincronização.
- O typecheck é uma baseline incremental para JS/JSX; `checkJs` estrito será habilitado por módulo.
- Persistência versionada, reordenação acessível por teclado, testes axe e Playwright estão planejados.

Consulte `CONTRIBUTING.md` para colaborar e `SECURITY.md` para relatar vulnerabilidades.

## Licença

Distribuído sob a licença MIT. Consulte `LICENSE`.
