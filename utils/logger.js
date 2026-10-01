const winston = require('winston');

const emProducao = process.env.NODE_ENV === 'production';

// sempre loga no console: em producao (ex. Render) e de la que os logs sao lidos.
// Em producao fica em JSON e sem cores; em desenvolvimento, no formato simples.
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console({
      format: emProducao
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

module.exports = logger;
