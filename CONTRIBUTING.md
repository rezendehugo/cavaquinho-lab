# Contribuindo

Obrigado por contribuir com o Cavaquinho Lab.

## Preparação

1. Use Node.js 22 e npm 11.
2. Instale com `npm ci`.
3. Crie uma branch curta e focada.
4. Preserve o comportamento existente, salvo quando a mudança estiver documentada.

## Qualidade

Antes de abrir um pull request, execute:

```bash
npm run validate
```

Inclua testes para correções e regras de domínio. Priorize funções determinísticas para parsing, afinação, formas e sequências. Não inclua segredos, dados pessoais, builds, logs ou arquivos locais.

## Pull requests

- Explique o problema e a solução.
- Mantenha o escopo pequeno e revisável.
- Descreva testes manuais relevantes, especialmente teclado e responsividade.
- Registre limitações ou trabalho posterior sem ampliar silenciosamente o escopo.

Falhas de segurança não devem ser publicadas em issues; siga `SECURITY.md`.
