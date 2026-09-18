const { Usuario, Relatorio } = require('../models');
const { checaSaldo } = require('../services');
const { logger } = require('../utils');

const TAMANHO_DA_PAGINA = 10;

const relatoriosWorker = async(__, done) => {
    try {
        logger.info('Buscando todos os usuarios da base...');

        let temMaisUsuarios = true;
        let skip = 0;

        while (temMaisUsuarios) {
            const usuarios = await Usuario.find().skip(skip).limit(TAMANHO_DA_PAGINA);

            if (!usuarios.length) {
                temMaisUsuarios = false;
                break;
            }

            for (const usuario of usuarios) {
                logger.info(`Criando relatorio para o usuario ${usuario._id}`);

                await Relatorio.create({
                    usuarioId: usuario._id,
                    data: new Date(),
                    saldo: await checaSaldo(usuario),
                });
            }

            skip += TAMANHO_DA_PAGINA;
        }

        logger.info('Relatorios criados com sucesso');
        done();
    } catch (err) {
        logger.error(`Erro ao processar o job ${err.message}`);
        done(err);
    }
};

module.exports = relatoriosWorker;
