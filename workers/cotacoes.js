const { Cotacao } = require('../models');
const { buscaCotcoesOnline, buscaCotacoesOnline } = require('../services');
const { logger } = require('../utils');

const cotacoesWorker = async (job, done) => {
   try{
    logger.info(`Buscando cotacoes... Tentativa ${job.attemptsMade + 1}/${job.opts.attempts}`);

    const cotacoes = await buscaCotacoesOnline();

    logger.info('Cotacoes requisitadas com sucesso...');

    await Cotacao.insertMany(cotacoes);

    logger.info('Cotacoes inseridas no banco!');

    done();
   } catch (err) {
        logger.error(`Erro ao processar o job ${err.message}`);
        done(err);
   }
    
};

module.exports = cotacoesWorker;