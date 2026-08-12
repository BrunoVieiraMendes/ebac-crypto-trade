const { FechamentoDiario } = require('../models');
const { buscaCotacoesPorData, analisaCotacoes } = require('../services'); // Importe os novos serviços
const { logger } = require('../utils');

const fechamentoWorker = async (job, done) => {
   try {
        const dataHoje = new Date();
        const dataOntem = new Date(dataHoje);
        dataOntem.setDate(dataOntem.getDate() - 1);
        
        const stringHoje = dataHoje.toISOString().split('T')[0];
        const stringOntem = dataOntem.toISOString().split('T')[0];

        logger.info(`Buscando dados para fechamento: ${stringOntem} vs ${stringHoje}`);

        // 1. Busca os dados REAIS no MongoDB
        const cotacoesOntem = await buscaCotacoesPorData(stringOntem);
        const cotacoesHoje = await buscaCotacoesPorData(stringHoje);

        // Verifica se há dados para comparar
        if (Object.keys(cotacoesOntem).length === 0 || Object.keys(cotacoesHoje).length === 0) {
            throw new Error('Dados insuficientes para comparar datas.');
        }

        // 2. Processa a análise
        const resultado = analisaCotacoes(cotacoesOntem, cotacoesHoje, stringHoje);

        // 3. Salva no banco
        await FechamentoDiario.create(resultado);

        logger.info(`Fechamento diário salvo com sucesso para o dia ${stringHoje}`);
        done();
   } catch (err) {
        logger.error(`Erro no fechamento: ${err.message}`);
        done(err);
   }
};

module.exports = fechamentoWorker;