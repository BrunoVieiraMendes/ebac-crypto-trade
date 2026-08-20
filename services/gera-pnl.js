const { Relatorio } = require('../models');

const geraPnl = async(usuario) => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const relatorios = await Relatorio.aggregate([
        {
            $match: {
                usuarioId: usuario._id,
                data: { $gte: ontem },
            }
        },
        { $sort: { data: -1} }
    ]);
    
    if (relatorios.length === 0) {
        return 0;
    }

    if (relatorios.length === 1) {
        return relatorios[0].saldo;
    }

    return relatorios[0].saldo - relatorios[1].saldo;
};

module.exports = geraPnl;