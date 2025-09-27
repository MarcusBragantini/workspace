# Sistema SaaS Bot MVB - Plano de Desenvolvimento

## Arquivos a serem criados:

### 1. Backend (Node.js + MySQL)
- `server/app.js` - Servidor principal Express
- `server/config/database.js` - Configuração MySQL
- `server/models/User.js` - Modelo de usuário
- `server/models/License.js` - Modelo de licenças
- `server/routes/auth.js` - Rotas de autenticação
- `server/routes/admin.js` - Rotas administrativas
- `server/middleware/auth.js` - Middleware de autenticação

### 2. Frontend (React + Shadcn-ui)
- `src/pages/Login.tsx` - Página de login
- `src/pages/Dashboard.tsx` - Dashboard principal do bot
- `src/pages/Admin.tsx` - Painel administrativo
- `src/components/BotInterface.tsx` - Interface do bot trading
- `src/components/LicenseManager.tsx` - Gerenciador de licenças
- `src/lib/api.ts` - Cliente API
- `src/contexts/AuthContext.tsx` - Contexto de autenticação

### 3. Configuração
- `package.json` (servidor) - Dependências do backend
- `.env.example` - Variáveis de ambiente

## Funcionalidades:
1. ✅ Sistema de autenticação JWT
2. ✅ Controle de usuários e permissões
3. ✅ Gerador e validador de licenças
4. ✅ Sistema de bloqueio por vencimento
5. ✅ Interface administrativa completa
6. ✅ Dashboard profissional do bot
7. ✅ Integração com MySQL
8. ✅ API RESTful completa