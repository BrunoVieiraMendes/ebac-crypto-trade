require('dotenv').config()

const createError = require('http-errors');
const express = require('express');
const passport = require('passport');

require('./routes/v1/auth/jwt'); //teste

const { logger } = require('./utils');
const { connect } = require('./models');
const router = require('./routes');

const app = express();

// configurando autenticacao
app.use(passport.initialize());

// configurando formatos de parâmetros
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// declarando rotas
app.use('/', router);

// caso nenhuma rota de match, redireciona para a 404
app.use(function(_req, _res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, _req, res, _next) {
  res.status(err.status || 500);
  res.json({
    sucesso: false,
    erro: err.message,
  });
});

const porta = 3000;
app.listen(porta, () => {
  connect();

  logger.info(`Servidor ouvindo na porta ${porta}`);
});

module.exports = app;
