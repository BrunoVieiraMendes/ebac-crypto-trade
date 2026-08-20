const { logger } = require('../utils');

const relatoriosWorker = async(__, done) => {
    try {
        logger.info('Buscando todos os usuarios da base...');

        let temMaisUsuario = true;
        let skip = 0;

        while (temMaisUsuario) {
            const usuarios = await Usuario.find().skip(skip).limit(10);

            if(!usuarios.length) {
                temMaisUsuarios = false;
            }

            for (const usuario of usuarios) {
            logger.info(`Criando relatorio para o usuario ${usuario._id}`);

                await Relatorio.create({
                usuarioId: usuario._id,
                data: new Date(),
                saldo: await checaSaldo(usuario),
                });
            }

            skip += 10;

        }

        logger.info('Relatorios criados com sucesso');
        done();
    
    }  catch (err) {
            logger.error(`Erro ao processar o job ${err.message}`);
            done(err);
    }

};

module.exports = relatoriosWorker;

