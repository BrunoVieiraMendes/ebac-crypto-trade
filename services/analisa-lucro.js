const { Relatorio } = require('../models');
const { LUCRO_PARA_PARABENIZAR } = require('../constants');

/**
 * Analisa o lucro em trade do usuario no dia anterior.
 *
 * O worker de relatorios grava, todo dia a meia noite, uma foto do saldo de cada
 * usuario. Entao o lucro do dia anterior e a diferenca entre as duas fotos mais
 * recentes: a de hoje (saldo no fim de ontem) e a de ontem.
 */
const analisaLucroEmTrade = async (usuario, lucroMinimo = LUCRO_PARA_PARABENIZAR) => {
    const relatorios = await Relatorio.find({ usuarioId: usuario._id })
        .sort({ data: -1 })
        .limit(2);

    // sem duas fotos do saldo nao da para comparar um dia com o outro
    if (relatorios.length < 2) {
        return {
            lucro: 0,
            teveLucro: false,
        };
    }

    const lucro = relatorios[0].saldo - relatorios[1].saldo;

    return {
        lucro,
        teveLucro: lucro > lucroMinimo,
    };
};

module.exports = analisaLucroEmTrade;
