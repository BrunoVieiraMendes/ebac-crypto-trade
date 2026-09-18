const { Usuario } = require('../models');
const { analisaLucroEmTrade, enviaEmailDeParabenizacao } = require('../services');
const { LUCRO_PARA_PARABENIZAR } = require('../constants');
const { logger } = require('../utils');

const TAMANHO_DA_PAGINA = 10;

const parabenizacaoWorker = async (job, done) => {
    try {
        logger.info(`Procurando usuarios que lucraram mais de R$${LUCRO_PARA_PARABENIZAR} ontem... Tentativa ${job.attemptsMade + 1}/${job.opts.attempts}`);

        let parabenizados = 0;
        let skip = 0;
        let temMaisUsuarios = true;

        while (temMaisUsuarios) {
            const usuarios = await Usuario.find({ confirmado: true })
                .skip(skip)
                .limit(TAMANHO_DA_PAGINA);

            if (!usuarios.length) {
                temMaisUsuarios = false;
                break;
            }

            for (const usuario of usuarios) {
                const { lucro, teveLucro } = await analisaLucroEmTrade(usuario);

                if (!teveLucro) {
                    continue;
                }

                try {
                    await enviaEmailDeParabenizacao(usuario, lucro);
                    parabenizados += 1;

                    logger.info(`E-mail de parabens enviado para o usuario ${usuario._id} (lucro de ${lucro})`);
                } catch (err) {
                    // um e-mail que falha nao pode derrubar a fila inteira
                    logger.error(`Erro ao enviar o e-mail de parabens para ${usuario._id}: ${err.message}`);
                }
            }

            skip += TAMANHO_DA_PAGINA;
        }

        logger.info(`Parabenizacao concluida: ${parabenizados} usuario(s) parabenizado(s)`);

        done();
    } catch (err) {
        logger.error(`Erro ao processar o job ${err.message}`);
        done(err);
    }
};

module.exports = parabenizacaoWorker;
