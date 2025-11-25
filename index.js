import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import session from "express-session";

const app = express();
const port = 3500;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "segredo-sessao",
    resave: false,
    saveUninitialized: false,
  })
);

// Cookie de último acesso DEPOIS da sessão
app.use((req, res, next) => {
  const agora = new Date().toLocaleString("pt-BR");
  res.cookie("ultimoAcesso", agora, { httpOnly: true });
  next();
});

app.post("/fornecedor/cadastrar", requireLogin, (req, res) => {
  const campos = ["cnpj","razao","nomeFantasia","endereco","cidade","uf","cep","email","telefone"];
  const erros = [];

  campos.forEach((c) => {
    if (!req.body[c] || req.body[c].trim() === "") erros.push(c);
  });

  if (erros.length > 0) {
    const lista = erros.map(e => `<li>${e}</li>`).join("");
    return res.send(layout(req, "Erro no cadastro", `
      <div class="alert alert-danger">Preencha os campos obrigatórios:<ul>${lista}</ul></div>
      <a href="/fornecedor" class="btn btn-secondary">Voltar</a>
    `));
  }

  fornecedores.push(req.body); // só fica na memória
  res.send(layout(req, "Sucesso", `
    <div class="alert alert-success">Fornecedor cadastrado com sucesso!</div>
    <a href="/fornecedor" class="btn btn-primary">Voltar</a>
  `));
});

if (fs.existsSync(FILE)) {
  try {
    fornecedores = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    fornecedores = [];
  }
}

// Middleware para checar login
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.send(
      layout(
        req,
        "Acesso negado",
        `<div class="alert alert-danger">Você precisa fazer login para acessar esta página.</div>
         <a href="/login" class="btn btn-primary">Ir para o Login</a>`
      )
    );
  }
  next();
}


// Layout
function layout(req, titulo, conteudo) {
  
  const user = req.session.user ? `Logado como: ${req.session.user}` : "Não autenticado";

  const ultimo = req.headers.cookie
    ? decodeURIComponent(
        req.headers.cookie.split("ultimoAcesso=")[1].split(";")[0]
      )
    : "Primeiro acesso";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${titulo}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
      body { background-color: #e8f1ff !important; }
      .navbar { background-color: #0d6efd !important; }
      table thead { background-color: #0d6efd !important; color: white !important; }
    </style>
  </head>
  <body>

    <nav class="navbar navbar-expand-lg navbar-dark mb-4">
      <div class="container-fluid">
        <div class="collapse navbar-collapse">
          <ul class="navbar-nav">
            <li class="nav-item"><a class="nav-link" href="/">Inicio</a></li>
            <li class="nav-item"><a class="nav-link" href="/fornecedor">Cadastrar fornecedor</a></li>
            <li class="nav-item"><a class="nav-link" href="/login">Login</a></li>
            <li class="nav-item"><a class="nav-link" href="/logout">Logout</a></li>
          </ul>
        </div>
        <span class="text-white">${user}</span>
      </div>
    </nav>

    <div class="container">
      <div class="alert alert-info">Último acesso: ${ultimo}</div>
      ${conteudo}
    </div>
  </body>
  </html>`;
}


// ============================
// ROTAS
// ============================

app.get("/", (req, res) => {
  res.send(
    layout(req, "Home", `<h1>Bem-vindo ao cadastro de fornecedores</h1>`)
  );
});


// LOGIN
app.get("/login", (req, res) => {
  res.send(
    layout(
      req,
      "Login",
      `
      <h2>Login</h2>
      <form method="POST" class="mt-3" action="/login">
        <div class="mb-3">
          <label class="form-label">Usuário</label>
          <input name="user" class="form-control">
        </div>

        <div class="mb-3">
          <label class="form-label">Senha</label>
          <input type="password" name="pass" class="form-control">
        </div>

        <button class="btn btn-primary">Entrar</button>
      </form>`
    )
  );
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === "adm" && pass === "123456") {
    req.session.user = user;
    return res.send(
      layout(
        req,
        "Login",
        `<div class="alert alert-success">Login efetuado com sucesso!</div>
         <a href="/" class="btn btn-secondary">Home</a>`
      )
    );
  }

  res.send(
    layout(
      req,
      "Falha ao realizar login",
      `<div class="alert alert-danger">Usuário ou senha inválidos.</div>
       <a class="btn btn-secondary" href="/login">Tentar novamente</a>`
    )
  );
});


// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid"); // apaga o cookie da sessão
    res.redirect("/login"); // <-- muito melhor que enviar layout
  });
});



// FORMULÁRIO + LISTA (protegido)
app.get("/fornecedor", requireLogin, (req, res) => {
  const tabela = fornecedores
    .map(
      (f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${f.cnpj}</td>
        <td>${f.razao}</td>
        <td>${f.nomeFantasia}</td>
        <td>${f.cidade} / ${f.uf}</td>
        <td>${f.email}</td>
      </tr>`
    )
    .join("");

  res.send(
    layout(
      req,
      "Fornecedor",
      `
      <h2>Cadastro de Fornecedor</h2>

      <form method="POST" action="/fornecedor/cadastrar" class="row g-3 mt-2 mb-4">

        <div class="col-md-4">
          <label class="form-label">CNPJ</label>
          <input name="cnpj" class="form-control">
        </div>
        
        <div class="col-md-8">
          <label class="form-label">Razão Social</label>
          <input name="razao" class="form-control">
        </div>

        <div class="col-md-6">
          <label class="form-label">Nome Fantasia</label>
          <input name="nomeFantasia" class="form-control">
        </div>

        <div class="col-md-6">
          <label class="form-label">Endereço</label>
          <input name="endereco" class="form-control">
        </div>

        <div class="col-md-4">
          <label class="form-label">Cidade</label>
          <input name="cidade" class="form-control">
        </div>

        <div class="col-md-2">
          <label class="form-label">UF</label>
          <input name="uf" class="form-control">
        </div>

        <div class="col-md-3">
          <label class="form-label">CEP</label>
          <input name="cep" class="form-control">
        </div>

        <div class="col-md-4">
          <label class="form-label">Email</label>
          <input name="email" class="form-control">
        </div>

        <div class="col-md-4">
          <label class="form-label">Telefone</label>
          <input name="telefone" class="form-control">
        </div>

        <div class="col-12 mt-3">
          <button class="btn btn-success">Cadastrar</button>
        </div>
      </form>

      <h3>Fornecedores cadastrados</h3>

      <table class="table table-striped mt-3">
        <thead>
          <tr>
            <th>#</th><th>CNPJ</th><th>Razão Social</th><th>Fantasia</th><th>Local</th><th>Email</th>
          </tr>
        </thead>
        <tbody>${tabela}</tbody>
      </table>
      `
    )
  );
});


// CADASTRAR FORNECEDOR
app.post("/fornecedor/cadastrar", requireLogin, (req, res) => {
  const campos = ["cnpj","razao","nomeFantasia","endereco","cidade","uf","cep","email","telefone"];
  const erros = [];

  campos.forEach((c) => {
    if (!req.body[c] || req.body[c].trim() === "") erros.push(c);
  });

  if (erros.length > 0) {
    const lista = erros.map((e) => `<li>${e}</li>`).join("");

    return res.send(
      layout(
        req,
        "Erro no cadastro",
        `<div class="alert alert-danger">
          Preencha os campos obrigatórios:
          <ul>${lista}</ul>
        </div>
        <a href="/fornecedor" class="btn btn-secondary">Voltar</a>`
      )
    );
  }

  fornecedores.push(req.body);
  fs.writeFileSync(FILE, JSON.stringify(fornecedores, null, 2));

  res.send(
    layout(
      req,
      "Sucesso",
      `<div class="alert alert-success">Fornecedor cadastrado com sucesso!</div>
       <a href="/fornecedor" class="btn btn-primary">Voltar</a>`
    )
  );
});


app.listen(port, () => {
  console.log(`Servidor rodando: http://localhost:${port}`);
});
