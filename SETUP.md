# PostgreSQL e deploy na Vercel

O backend usa PostgreSQL via `pg`. O banco de produção é provisionado pela integração Neon conectada ao projeto Vercel `sis-age`; a conexão é fornecida em `DATABASE_URL`.

## Desenvolvimento local

- Node.js 20 ou superior e npm.
- PostgreSQL local ou as variáveis de desenvolvimento da Vercel.

Instale dependências e aplique o schema:

```powershell
npm install
vercel env pull .env.local --environment development
npm run db:setup
```

Inicie localmente com o mesmo ambiente:

```powershell
node --env-file=.env.local server.js
```

Para um PostgreSQL local, defina `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD` antes de executar `npm run db:setup` ou `npm start`.

## Banco de produção

O schema idempotente está em `Agendamentos/sql/sql.sql`. Para aplicá-lo ao banco Neon conectado ao projeto:

```powershell
vercel env pull .env.local --environment production
npm run db:setup
```

O schema cria tabelas, índices e recursos iniciais, mas não cria contas com senhas públicas. Registre a primeira conta pela aplicação e promova-a a administradora:

```powershell
npm run db:promote-admin -- seu-email@dominio.com
```

As novas contas são docentes por padrão. Guarde `DATABASE_URL` e `JWT_SECRET` apenas nas variáveis do projeto Vercel; não os coloque no repositório.

## Deploy na Vercel

O projeto `sis-age` está vinculado e a integração Neon fornece `DATABASE_URL` para Production, Preview e Development. `vercel.json` configura o Express, e `npm run build` copia as páginas e assets para `public/`, ignorado pelo Git e sem incluir `Agendamentos/sql/`.

Para publicar a versão de produção após aplicar o schema:

```powershell
vercel deploy --prod
```

O login Google é opcional. Para habilitá-lo, configure `GOOGLE_CLIENT_ID` no projeto Vercel e autorize o domínio HTTPS da aplicação no Google Cloud Console.

## Primeiro acesso

1. Abra o domínio publicado ou `http://localhost:3000`.
2. Crie uma conta pela tela de cadastro.
3. Execute `db:promote-admin` para conceder acesso administrativo à conta escolhida.
4. Para alterar a senha, entre na conta e use **Alterar senha**; a senha atual é obrigatória.
5. A foto de perfil permanece salva apenas no navegador utilizado.

## 📁 Estrutura de pastas

```
SisAge/
├── server.js
├── package.json
├── vercel.json
├── scripts/
│   ├── prepare-vercel.js
│   ├── setup-postgres.js
│   └── promote-admin.js
└── Agendamentos/
  ├── index.html
  ├── login.html
  ├── register.html
  ├── reset-password.html
  ├── relatorios.html
  ├── api.js
  ├── app.js
  ├── auth.js
  ├── report.js
  ├── css/style.css
  ├── js/script.js
  └── sql/sql.sql              # Schema PostgreSQL
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Fazer login com e-mail e senha
- `GET /api/auth/google/config` - Obter configuração pública do botão Google
- `POST /api/auth/google` - Validar credencial Google e iniciar sessão
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/reset-password` - Redefinir senha

### Recursos
- `GET /api/recursos` - Listar todos os recursos
- `POST /api/recursos` - Criar novo recurso (requer token, apenas coordenador/admin)
- `PUT /api/recursos/:id` - Atualizar recurso (requer token, apenas coordenador/admin)
- `DELETE /api/recursos/:id` - Deletar recurso (requer token, apenas coordenador/admin)

### Reservas
- `GET /api/reservas` - Listar minhas reservas (requer token)
- `GET /api/agenda` - Consultar disponibilidade da agenda (requer token)
- `POST /api/reservas` - Criar nova reserva (requer token)
- `PUT /api/reservas/:id` - Atualizar reserva (requer token, coordenador/admin)
- `DELETE /api/reservas/:id` - Cancelar reserva (requer token)

### Relatórios
- `GET /api/relatorios/uso` - Relatório de uso de recursos (requer token)

## 🐛 Solução de problemas

### Erro: conexão PostgreSQL recusada
- Confirme que `DATABASE_URL` está definida no ambiente usado.
- Para desenvolvimento local, confirme que o PostgreSQL está ativo e que os valores `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD` estão corretos.
- No Vercel, verifique a integração `sis-age-postgres` e faça um novo deploy depois de alterar variáveis.

### Erro: relation "usuarios" does not exist
- Aplique o schema com `vercel env run -e production -- npm run db:setup`.

### Frontend não consegue conectar ao servidor
- **Problema:** Servidor não está rodando ou está em porta diferente
- **Solução:** 
  1. Verifique se `npm start` está rodando
  2. Verifique se a porta é 3000
  3. Atualize `API_BASE_URL` em `api.js` se necessário

## Desenvolvimento

### Iniciar em modo desenvolvimento (com auto-reload):
```bash
npm run dev
```

Isso requer instalar `nodemon`:
```bash
npm install --save-dev nodemon
```

## 🔐 Segurança

**Importante:**
- `JWT_SECRET` é obrigatório em produção e deve ser gerado aleatoriamente.
- Não versione `.env.local`, `DATABASE_URL` ou `JWT_SECRET`.
- O seed não cria usuários com senhas públicas. Crie uma conta e promova-a com `db:promote-admin`.

## ✅ Checklist de Setup

- [ ] Integração Neon conectada ao projeto Vercel
- [ ] Schema aplicado com `npm run db:setup`
- [ ] Primeiro usuário promovido a administrador
- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor rodando (`npm start`)
- [ ] Aplicação acessível em http://localhost:3000

## 📞 Suporte

Se tiver dúvidas:
1. Verifique os logs do servidor (terminal)
2. Verifique o console do navegador (F12)
3. Revise este guia de troubleshooting

---

**Desenvolvido para CETI Senador José Cândido Ferraz**
