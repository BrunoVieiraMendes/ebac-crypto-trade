require('dotenv').config();

const app = require('./app');

const { logger } = require('./utils');
const { connect } = require('./models');
const { agendaTarefas } = require('./workers');

// o Render (e outros provedores) informa a porta pela variavel PORT
const porta = process.env.PORT || 3000;

const inicia = async () => {
  // conecta no banco antes de tudo: as filas e as rotas dependem dele
  await connect();
  logger.info('Conectado ao MongoDB');

  await agendaTarefas();

  app.listen(porta, () => {
    logger.info(`Servidor ouvindo na porta ${porta}`);
  });
};

inicia().catch((e) => {
  logger.error(`Erro ao iniciar o servidor: ${e.message}`);
  process.exit(1);
});
