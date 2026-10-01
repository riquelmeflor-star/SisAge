# 🚀 Integração com Banco de Dados MySQL - Sistema CETI

Este guia explica como configurar e executar o sistema com integração completa ao banco de dados MySQL.

## 📋 Pré-requisitos

- **Node.js** (v14+) - [Baixar](https://nodejs.org/)
- **MySQL** (v5.7+) - [Baixar](https://dev.mysql.com/downloads/mysql/)
- **npm** (vem com Node.js)

## 🔧 Instalação

### 1️⃣ Criar a base de dados MySQL

Abra o MySQL Workbench ou MySQL Command Line e execute o script `sql.sql`:

```bash
mysql -u root -p < "g:\PROFESSOR SEDUC\2026\CETI SJCF\INTEGRAL\Projeto integrador\Projeto Integrador G2\Projeto Integrador G2\Biblioteca\sql\sql.sql"
```

Ou via MySQL Workbench:
- Abra o arquivo `sql.sql`
- Clique em **Execute All** (ou pressione Ctrl+Shift+Enter)

**Verifique se a base de dados foi criada:**
```sql
USE ceti_db;
SHOW TABLES;
```

### 2️⃣ Instalar dependências Node.js

Navegue até a pasta do projeto:

```powershell
cd "g:\PROFESSOR SEDUC\2026\CETI SJCF\INTEGRAL\Projeto integrador\Projeto Integrador G2\Projeto Integrador G2"
```

Instale as dependências:

```bash
npm install
```

### 3️⃣ Configurar variáveis de ambiente (Opcional)

Se necessário, edite o arquivo `server.js` e atualize as credenciais MySQL:

```javascript
const pool = mysql.createPool({
    host: 'localhost',      // Seu host MySQL
    user: 'root',           // Seu usuário MySQL
    password: '',           // Sua senha MySQL (deixe em branco se não tiver)
    database: 'ceti_db',    // Banco de dados criado
    ...
});
```

### 4️⃣ Iniciar o servidor

```bash
npm start
```

Você verá:
```
Servidor rodando em http://localhost:3000
Certifique-se de que o MySQL está rodando com a base de dados "ceti_db"
```

## 📱 Usando a aplicação

Após o servidor estar rodando:

1. Abra o navegador: **http://localhost:3000**
2. Faça login com uma das contas padrão:
   - **Email:** ana@ceti.edu.br | **Senha:** 123456 (Docente)
   - **Email:** carla@ceti.edu.br | **Senha:** 123456 (Coordenador)
   - **Email:** marcos@ceti.edu.br | **Senha:** 123456 (Docente)

## 📁 Estrutura de pastas

```
Projeto Integrador G2/
├── server.js                    # Servidor Express (novo)
├── package.json                 # Dependências Node.js (novo)
├── Biblioteca/
│   ├── index.html               # Dashboard (atualizado)
│   ├── login.html               # Login (atualizado)
│   ├── register.html            # Registro (atualizado)
│   ├── reset-password.html      # Reset de senha (atualizado)
│   ├── relatorios.html          # Relatórios (atualizado)
│   ├── api.js                   # Classe APIService (novo)
│   ├── app.js                   # Lógica do dashboard (atualizado)
│   ├── auth.js                  # Autenticação (atualizado)
│   ├── report.js                # Geração de relatórios
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── sql/
│       └── sql.sql              # Schema MySQL
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/reset-password` - Redefinir senha

### Recursos
- `GET /api/recursos` - Listar todos os recursos
- `POST /api/recursos` - Criar novo recurso (requer token, apenas coordenador/admin)
- `PUT /api/recursos/:id` - Atualizar recurso (requer token, apenas coordenador/admin)
- `DELETE /api/recursos/:id` - Deletar recurso (requer token, apenas coordenador/admin)

### Reservas
- `GET /api/reservas` - Listar minhas reservas (requer token)
- `POST /api/reservas` - Criar nova reserva (requer token)
- `DELETE /api/reservas/:id` - Cancelar reserva (requer token)

### Relatórios
- `GET /api/relatorios/uso` - Relatório de uso de recursos (requer token)

## 🐛 Solução de problemas

### Erro: "connect ECONNREFUSED 127.0.0.1:3306"
- **Problema:** MySQL não está rodando
- **Solução:** Inicie o serviço MySQL
  ```bash
  # Windows (como Administrador)
  net start MySQL80
  
  # macOS (via Homebrew)
  brew services start mysql
  
  # Linux
  sudo systemctl start mysql
  ```

### Erro: "Unknown database 'ceti_db'"
- **Problema:** Banco de dados não foi criado
- **Solução:** Execute o script `sql.sql` novamente

### Erro: "Access denied for user 'root'@'localhost'"
- **Problema:** Senha MySQL incorreta
- **Solução:** Atualize a senha em `server.js` ou use uma conta sem senha

### Frontend não consegue conectar ao servidor
- **Problema:** Servidor não está rodando ou está em porta diferente
- **Solução:** 
  1. Verifique se `npm start` está rodando
  2. Verifique se a porta é 3000
  3. Atualize `API_BASE_URL` em `api.js` se necessário

## 📊 Desenvolv

imento

### Iniciar em modo desenvolvimento (com auto-reload):
```bash
npm run dev
```

Isso requer instalar `nodemon`:
```bash
npm install --save-dev nodemon
```

## 🔐 Segurança

**⚠️ IMPORTANTE:** 
- Mude a chave secreta em `server.js` (`SECRET_KEY`) para produção
- Nunca commite arquivos com credenciais reais
- Use variáveis de ambiente para dados sensíveis

## ✅ Checklist de Setup

- [ ] MySQL instalado e rodando
- [ ] Base de dados `ceti_db` criada (via `sql.sql`)
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
