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

### Opção rápida (1 comando)

```bash
npm run dev:all
```

Esse comando faz tudo:
- sobe o PostgreSQL no Docker (`5433`)
- aplica o schema do banco automaticamente
- cria/atualiza os usuários (`Mateus` e `Andréa`)
- sobe backend e frontend juntos
- mata automaticamente qualquer processo antigo na porta `4200` e sobe o frontend de novo na `4200`

Para parar, pressione `Ctrl + C` no terminal e, se quiser desligar o banco Docker:

```bash
npm run db:down
```

### 1. Banco de dados

```bash
npm run db:up
```

Se você já tem um PostgreSQL local na porta `5432`, o Docker agora sobe na porta `5433`.

### 2. Backend

```bash
cp backend/.env.example backend/.env
npm run db:setup
npm run dev:api
```

API: http://localhost:3000

### 3. Criar os usuários

```bash
npm run db:seed-users
```

### 4. Frontend

```bash
npm run dev:web
```

Esse comando também mata automaticamente qualquer processo que estiver usando a porta `4200`.

App: http://localhost:4200

## Próximos passos

- Design na plataforma externa
- Implementar telas e integração com a API
