# Ajueasy Frontend

Plataforma web que conecta clientes e advogados — busca, marketplace de demandas, correspondentes jurídicos, feed e mais.

## Stack

| Ferramenta | Versão |
|---|---|
| Vite | 5.x |
| React | 18.x |
| TypeScript | 5.x |
| Tailwind CSS | 3.x |
| shadcn/ui (Radix UI) | — |
| react-router-dom | 6.x |
| Zustand | 4.x |
| react-hook-form + zod | — |
| Recharts | 2.x |
| Axios | 1.x |
| date-fns | 3.x |

## Rodar localmente

### 1. Pré-requisitos

- Node.js ≥ 18
- npm ≥ 9

### 2. Clonar e instalar

```bash
git clone <repo-url>
cd ajueasy-frontend
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e ajuste `VITE_API_URL` para apontar ao seu backend:

```env
VITE_API_URL=http://localhost:3333
VITE_APP_ENV=development
VITE_APP_URL=http://localhost:5173
```

### 4. Iniciar em desenvolvimento

```bash
npm run dev
```

O app estará disponível em [http://localhost:5173](http://localhost:5173).

### 5. Build de produção

```bash
npm run build
npm run preview   # para testar o build localmente
```

## Estrutura de pastas

```
src/
├── components/
│   ├── ui/          # Componentes base (Button, Input, Card, etc.)
│   ├── layout/      # Navbar, Footer, AppLayout, AuthLayout
│   └── shared/      # LawyerCard, StarRating, StatusBadge, etc.
├── pages/
│   ├── Landing/     # Página inicial
│   ├── Auth/        # Login, Cadastro, Recuperar senha
│   ├── Onboarding/  # Wizard de onboarding do advogado
│   ├── Search/      # Busca de advogados
│   ├── LawyerProfile/ # Perfil do advogado
│   ├── Feed/        # Feed de artigos
│   ├── Marketplace/ # Demandas e propostas
│   ├── Contracts/   # Contratos
│   ├── Review/      # Avaliações verificadas
│   ├── Correspondents/ # Módulo de correspondentes
│   ├── Dashboard/   # Painel do usuário
│   ├── Office/      # Painel do escritório + BI
│   ├── Admin/       # Painel administrativo (KYC, denúncias)
│   └── Institutional/ # FAQ, Termos, Privacidade, Segurança
├── services/
│   └── api/         # Axios client + endpoints + mock-data
├── store/           # Zustand (auth, ui)
├── types/           # Tipos TypeScript globais
├── lib/             # Utilitários (cn, formatDate, detectContactInfo…)
└── hooks/           # Hooks customizados
```

## Autenticação (demo)

No modo demo (sem backend), qualquer e-mail com senha `123456` faz login.
O usuário logado é mapeado para o advogado mock `Dr. Carlos Mendes`.

Para simular login como **cliente**, ajuste `mockUser` em `LoginPage.tsx`.

## Regras de negócio implementadas no front

| Regra | Implementação |
|---|---|
| Advogado não verificado ≠ visível na busca | `LawyerCard` + filtro em `SearchPage` |
| Advogado não verificado não pode enviar proposta | Verificação em `MarketplacePage` e `DemandDetailPage` |
| Avaliação apenas após contrato concluído | `ReviewPage` verifica `contract.status === 'completed'` |
| Bloqueio de contato direto antes do aceite | `detectContactInfo` + `ContactBlockWarning` em propostas e demandas |
| Badge "Avaliação verificada" | Apenas quando `review.isVerified === true` (vinculado a contrato) |
| Status "Em análise" no perfil | `Onboarding` step 4 + banner no `LawyerProfile` |

## Deploy

O app é um SPA estático — pode ser hospedado em:
- **Vercel**: `vercel --prod`
- **Netlify**: arraste a pasta `dist/`
- **AWS S3 + CloudFront**: configure redirect de `/*` para `index.html`
- **Nginx**: configure `try_files $uri /index.html;`

## Variáveis de ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `VITE_API_URL` | URL base do backend REST | Sim |
| `VITE_APP_ENV` | `development` / `staging` / `production` | Não |
| `VITE_STRIPE_PUBLIC_KEY` | Chave pública Stripe (pagamentos) | Não |
| `VITE_APP_URL` | URL do próprio frontend (para links em e-mails) | Não |
