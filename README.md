# Contabilidade Mateus & Andrea

Controle financeiro simples: **entradas** (salário/receitas) e **saídas** (gastos).

## Stack

- **Frontend:** Angular + SCSS
- **Backend:** Node.js + Express
- **Banco:** PostgreSQL

## Estrutura

```
contabilidade-mateus-andrea/
├── frontend/          # Angular (SCSS)
├── backend/           # API Express
├── database/          # SQL inicial (schema)
└── docker-compose.yml # PostgreSQL local
```

## Como subir (desenvolvimento)

### 1. Banco de dados

```bash
npm run db:up
```

### 2. Backend

```bash
cp backend/.env.example backend/.env
npm run dev:api
```

API: http://localhost:3000

### 3. Frontend

```bash
npm run dev:web
```

App: http://localhost:4200

## Próximos passos

- Design na plataforma externa
- Implementar telas e integração com a API
