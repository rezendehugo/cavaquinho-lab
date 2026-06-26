# Cavaquinho Lab

Aplicativo educacional para estudar cavaquinho: formas de acordes, sequências, análise harmônica, cores de estudo e exercícios.

## Desenvolvimento local

```bash
npm install
npm test
npm run build
npm run dev
```

## Docker

```bash
docker compose --profile dev up --build
docker compose --profile ci up --build --abort-on-container-exit
docker compose --profile preview up --build
```

O perfil `dev` habilita páginas experimentais com `VITE_SHOW_EMPTY_PAGES=true`. A publicação em GitHub Pages continua usando o build de produção.

## Publicação

O projeto usa GitHub Pages via GitHub Actions e publica o build Vite em:

https://rezendehugo.github.io/cavaquinho-lab/
