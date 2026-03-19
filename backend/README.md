# Ajueasy Backend API

REST API para a plataforma Ajueasy — conectando clientes a advogados verificados.

**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · JWT

---

## Pré-requisitos

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

---

## Rodar localmente

### 1. Clone e instale as dependências

```bash
git clone <repo-url> ajueasy-backend
cd ajueasy-backend
npm install
```

### 2. Configure o ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais (veja a tabela abaixo).

### 3. Configure o banco de dados

```bash
# Criar o banco no PostgreSQL
createdb ajueasy

# Rodar as migrations
npm run db:migrate

# (Opcional) Popular com dados de desenvolvimento
npm run db:seed
```

### 4. Iniciar o servidor

```bash
# Desenvolvimento (hot-reload)
npm run dev

# Produção
npm run build && npm start
```

O servidor sobe em `http://localhost:3333` por padrão.

---

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Connection string PostgreSQL (`postgresql://user:pass@host:5432/db`) |
| `JWT_SECRET` | ✅ | — | Segredo para assinar access tokens (mínimo 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | — | Segredo para refresh tokens (diferente do anterior) |
| `NODE_ENV` | — | `development` | `development` \| `production` |
| `PORT` | — | `3333` | Porta HTTP |
| `CORS_ORIGINS` | — | `http://localhost:5173` | Origins permitidas (separadas por vírgula) |
| `UPLOAD_DIR` | — | `./uploads` | Diretório para uploads de arquivos |
| `MAX_FILE_SIZE_MB` | — | `10` | Tamanho máximo de upload em MB |
| `ADMIN_EMAIL` | — | `admin@ajueasy.com.br` | Email do admin criado no seed |
| `ADMIN_PASSWORD` | — | `Admin@2024!` | Senha do admin no seed |
| `SMTP_HOST` | — | — | Host SMTP (produção) |
| `SMTP_PORT` | — | `587` | Porta SMTP |
| `SMTP_USER` | — | — | Usuário SMTP |
| `SMTP_PASS` | — | — | Senha SMTP |
| `SMTP_FROM` | — | `noreply@ajueasy.com.br` | Remetente dos e-mails |

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor com hot-reload (tsx watch) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Serve o build de produção |
| `npm run db:migrate` | Aplica migrations pendentes |
| `npm run db:generate` | Regenera o Prisma Client |
| `npm run db:seed` | Popula o banco com dados de dev |
| `npm run db:studio` | Abre o Prisma Studio (UI visual) |
| `npm run db:reset` | Reset do banco + seed (dev only) |

---

## Endpoints principais

### Autenticação — `/auth`

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Criar conta (CLIENT ou LAWYER) |
| POST | `/auth/login` | Login → retorna access + refresh token |
| POST | `/auth/refresh` | Renovar access token via refresh token |
| GET | `/auth/me` | Perfil do usuário autenticado |
| POST | `/auth/reset-password` | Solicitar reset de senha (envia e-mail) |
| POST | `/auth/reset-password/confirm` | Confirmar novo senha com token |
| POST | `/auth/logout` | Invalidar refresh token |

### Advogados — `/lawyers`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/lawyers` | Buscar advogados verificados (filtros: specialty, uf, city, minRating, plan, search) |
| GET | `/lawyers/:id` | Perfil público do advogado |
| PATCH | `/lawyers/:id` | Atualizar perfil (advogado autenticado) |
| GET | `/lawyers/:id/reviews` | Avaliações do advogado |
| POST | `/lawyers/:id/kyc` | Enviar documentos KYC (multipart/form-data) |
| GET | `/lawyers/:id/kyc` | Listar documentos KYC (owner + admin) |

### Marketplace — `/demands`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/demands` | Listar demandas abertas |
| GET | `/demands/:id` | Detalhe de uma demanda |
| POST | `/demands` | Criar demanda (CLIENT) |
| POST | `/demands/:id/proposals` | Enviar proposta (LAWYER verificado) |
| PATCH | `/demands/:id/proposals/:proposalId/accept` | Aceitar proposta → cria contrato |
| PATCH | `/demands/:id/proposals/:proposalId/reject` | Rejeitar proposta |

### Contratos — `/contracts`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/contracts` | Contratos do usuário autenticado |
| GET | `/contracts/:id` | Detalhe do contrato |
| PATCH | `/contracts/:id/complete` | Marcar como concluído (CLIENT) |
| PATCH | `/contracts/:id/dispute` | Abrir disputa |
| GET | `/contracts/:id/can-review` | Verificar se pode avaliar |

### Avaliações — `/contracts/:contractId/review`

| Método | Rota | Descrição |
|---|---|---|
| POST | `/contracts/:contractId/review` | Criar avaliação verificada (contrato COMPLETED) |

### Feed — `/feed`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/feed/posts` | Listar posts |
| GET | `/feed/posts/:id` | Post com comentários |
| POST | `/feed/posts` | Criar post (LAWYER verificado) |
| POST | `/feed/posts/:id/like` | Curtir/descurtir |
| POST | `/feed/posts/:id/comments` | Comentar |

### Correspondentes — `/correspondents`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/correspondents/requests` | Pedidos abertos |
| GET | `/correspondents/requests/:id` | Detalhe |
| POST | `/correspondents/requests` | Criar pedido (LAWYER verificado) |
| POST | `/correspondents/requests/:id/proposals` | Enviar proposta |
| PATCH | `/correspondents/requests/:id/proposals/:proposalId/accept` | Aceitar proposta |
| POST | `/correspondents/requests/:id/document` | Enviar documento (multipart) |

### Admin — `/admin` (requer role ADMIN)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/stats` | Estatísticas gerais |
| GET | `/admin/kyc/queue` | Fila de aprovação KYC |
| PATCH | `/admin/kyc/:lawyerId/approve` | Aprovar KYC |
| PATCH | `/admin/kyc/:lawyerId/reject` | Rejeitar KYC (com nota) |
| GET | `/admin/users` | Listar usuários |
| PATCH | `/admin/users/:userId/ban` | Banir usuário |
| PATCH | `/admin/users/:userId/unban` | Desbanir usuário |
| GET | `/admin/denunciations` | Listar denúncias |
| PATCH | `/admin/denunciations/:id/resolve` | Resolver denúncia (warn/ban/dismiss) |
| GET | `/admin/audit` | Log de ações administrativas |

---

## Regras de negócio

### Advogados não verificados
- Não aparecem na busca (`isVisible: false`)
- Não podem enviar propostas (retorna 403)
- Não podem criar pedidos de correspondente

### Avaliações verificadas
- Só criáveis quando `contract.status === COMPLETED`
- Uma avaliação por contrato
- `isVerified: true` sempre (badge "verificado" no frontend)
- Recalcula a média do advogado automaticamente

### Detecção de dados de contato
- Middleware `contactGuard` bloqueia telefone, e-mail, WhatsApp, Telegram, Instagram em descrições de demandas, propostas e pedidos de correspondente
- Retorna 422 com o nome do campo infrator

### Tokens
- **Access token**: JWT, expira em 15 minutos
- **Refresh token**: JWT, expira em 7 dias, armazenado no banco e rotacionado a cada uso

---

## Fluxo E2E (exemplo)

```
1. POST /auth/register        → cria conta CLIENT
2. POST /demands              → cliente cria demanda
3. POST /auth/login           → advogado faz login (role LAWYER, status VERIFIED)
4. POST /demands/:id/proposals → advogado envia proposta
5. PATCH /demands/:id/proposals/:pid/accept → cliente aceita → Contrato criado (ACTIVE)
6. PATCH /contracts/:id/complete → cliente conclui → status COMPLETED
7. GET  /contracts/:id/can-review → verifica permissão → { canReview: true }
8. POST /contracts/:id/review → avaliação verificada criada, rating do advogado atualizado
```

---

## Contas do seed

Após `npm run db:seed`, as seguintes contas estarão disponíveis (senha: `123456`):

| Papel | E-mail | Obs. |
|---|---|---|
| Admin | admin@ajueasy.com.br | senha: `Admin@2024!` |
| Cliente | joao.cliente@example.com | — |
| Cliente | maria.cliente@example.com | — |
| Advogado | carlos.mendes@example.com | VERIFIED, PRO |
| Advogado | ana.lima@example.com | VERIFIED, FREE |
| Advogado | felipe.santos@example.com | VERIFIED, PRO |
| Advogado | juliana.costa@example.com | UNDER\_REVIEW |

---

## Deploy

### Render

1. Crie um serviço **Web Service** apontando para este repositório
2. Configure as variáveis de ambiente no painel do Render
3. **Build Command:** `npm install && npm run build && npm run db:migrate`
4. **Start Command:** `npm start`
5. Adicione um serviço **PostgreSQL** no Render e copie a `DATABASE_URL` para o Web Service

O arquivo `render.yaml` na raiz já define a infraestrutura completa.

### Railway

```bash
railway login
railway init
railway add postgresql
railway deploy
```

Defina as variáveis de ambiente via `railway variables set KEY=VALUE`.

### Fly.io

```bash
fly launch
fly postgres create
fly secrets set DATABASE_URL=... JWT_SECRET=... JWT_REFRESH_SECRET=...
fly deploy
```

---

## Estrutura do projeto

```
ajueasy-backend/
├── prisma/
│   ├── schema.prisma      # 16 modelos, 12 enums
│   └── seed.ts            # Dados iniciais de desenvolvimento
├── src/
│   ├── index.ts           # Entry point Express
│   ├── lib/
│   │   ├── prisma.ts      # Singleton Prisma Client
│   │   ├── jwt.ts         # Helpers JWT (sign/verify)
│   │   ├── mailer.ts      # Envio de e-mails
│   │   ├── contactFilter.ts # Detecção de dados de contato
│   │   ├── paginate.ts    # Helpers de paginação
│   │   └── audit.ts       # Registro de ações admin
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT authenticate + requireRole
│   │   ├── contactGuard.middleware.ts # Bloqueio de contatos
│   │   ├── upload.middleware.ts     # Multer configs
│   │   └── validate.middleware.ts   # Zod body/query validation
│   └── routes/
│       ├── auth.routes.ts
│       ├── users.routes.ts
│       ├── lawyers.routes.ts
│       ├── feed.routes.ts
│       ├── marketplace.routes.ts
│       ├── contracts.routes.ts
│       ├── reviews.routes.ts
│       ├── correspondents.routes.ts
│       └── admin.routes.ts
├── .env.example
├── render.yaml
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```
