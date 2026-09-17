const { Usuario } = require('../models');

const sacaCrypto = async(usuario, codigo, valor) => {
    if (typeof valor !== 'number' || valor <= 0) {
        throw new Error('Voce deve informar um valor maior que zero para sacar');
    }

    const chamadaDeAtualizacao = await Usuario.updateOne(
        {
            _id: usuario._id,
            moedas: {
                $elemMatch: {
                    codigo: codigo,
                    quantidade: {
                        $gte: valor,
                    }
                }
            }
        },
        {
            $inc: {
                'moedas.$.quantidade': -valor,
            }
        },
    );

    if(chamadaDeAtualizacao.matchedCount === 0) {
        throw new Error('Voce nao possui saldo para sacar esse valor!');
    }

    return (await Usuario.findOne({ _id: usuario._id })).moedas;
};

module.exports = sacaCrypto;