# PDV de Bar - MVP Matriz

Sistema de PDV para bar com frontend **React + Vite** e backend **Node + Express + Prisma**.

> **ATENCAO - EXECUCAO CORRETA DO FRONTEND**
> Este projeto e um **SPA React compilado pelo Vite**. Ele **NAO roda** como arquivo estatico.
>
> - **NAO** abra a aplicacao pela porta **5500** (extensao Live Server / servidor estatico do VS Code).
> - **NAO** abra a raiz do projeto com "Open with Live Server" ou `file://`. Isso exibe a arvore de diretorios em vez da aplicacao.
> - A URL correta do frontend em desenvolvimento e **http://localhost:5173**.

---

## Estrutura

```
pdv-matriz-root/
├── frontend/          # React (Vite) - SPA
│   ├── index.html     # Entry point do SPA (usado pelo Vite)
│   ├── vite.config.js # Configuracao Vite (porta 5173)
│   └── src/           # Codigo-fonte React
├── backend/           # Node/Express + Prisma
│   ├── src/server.js  # API na porta 3001
│   └── src/routes.js  # Rotas /api/*
├── scripts/start.mjs  # Inicializacao segura do frontend
├── vercel.json        # Deploy autonomo (Vercel)
├── netlify.toml       # Deploy autonomo (Netlify)
└── package.json       # Scripts unificados
```

---

## Como executar localmente

### 1. Instalar dependencias

```bash
# na raiz do projeto (pdv-matriz-root)
npm run install:all
```

### 2. Backend (API)

```bash
npm run start:backend
# API disponivel em http://localhost:3001
```

Configure o arquivo `backend/.env` a partir de `backend/.env.example`
(`DATABASE_URL`, `JWT_SECRET`, `PORT`).

### 3. Frontend (SPA React)

```bash
npm start
```

Ao executar, o terminal exibira o aviso com a **URL correta: http://localhost:5173**.

### 4. Tudo junto (frontend + backend em paralelo)

```bash
npm run dev
```

> Requer `npm install` na raiz (instala o `concurrently`).

---

## Deploy autonomo (sem dependencia do ambiente local)

### Vercel

O arquivo `vercel.json` ja define:

- `rootDirectory: "frontend"` - raiz do deploy.
- `buildCommand: "npm run build"` - build do Vite.
- `outputDirectory: "dist"` - saida compilada.
- `rewrites` - SPA: qualquer rota cai em `/index.html`.

Basta conectar o repositorio no Vercel, ou usar a CLI:

```bash
vercel --prod
```

### Netlify

O arquivo `netlify.toml` ja define `base = "frontend"`, `command = "npm run build"`,
`publish = "dist"` e o redirect SPA `/* -> /index.html`.

```bash
netlify deploy --prod
```

> A API (backend) precisa de um host proprio (Railway, Render, Fly.io, etc.).
> Aponte o frontend para a API via variavel de ambiente:
> `VITE_API_URL=https://SEU-BACKEND/api` no painel da plataforma de deploy.

---

## Scripts da raiz

| Script               | Descricao                                        |
| -------------------- | ------------------------------------------------ |
| `npm start`          | Inicia o frontend (Vite) com banner de aviso     |
| `npm run dev`        | Frontend + backend juntos (`concurrently`)       |
| `npm run start:frontend` | Inicia somente o frontend                   |
| `npm run start:backend`  | Inicia somente o backend                     |
| `npm run build`      | Gera o build de producao do frontend em `dist`   |
| `npm run preview`    | Previsualiza o build de producao (porta 4173)    |
| `npm run install:all`| Instala dependencias de frontend e backend       |

---

## Rotas do frontend

- `/login` - Autenticacao
- `/garcom` - Garcom (ADMIN)
- `/caixa` - Caixa (ADMIN)
- `/gestor` - Gestor (somente ADMIN)
