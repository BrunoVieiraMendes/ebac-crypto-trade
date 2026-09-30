const checaSaldo = require('./checa-saldo');

const deposita = async (usuario, valor) => {
    // sem essa checagem um valor em texto ("100") era concatenado ao saldo
    if (typeof valor !== 'number' || valor <= 0) {
        throw new Error('Voce deve informar um valor maior que zero para depositar');
    }

    usuario.depositos.push({ valor: valor, data: new Date(), cancelado: false });

    const saldoEmReais = usuario.moedas.find(m => m.codigo === 'BRL');
    if (saldoEmReais) {
        saldoEmReais.quantidade += valor;
    } else {
        usuario.moedas.push({ codigo: 'BRL', quantidade: valor });
    }

    // um unico save: se o deposito for invalido (ex. menor que 100) o saldo nao muda
    await usuario.save();

    return {
        saldo: await checaSaldo(usuario),
        depositos: usuario.depositos,
    };
};

module.exports = deposita;
