const checaSaldo = require('./checa-saldo');

const sacaReais = async (usuario, valor) => {
    if (typeof valor !== 'number' || valor <= 0) {
        throw new Error('Voce deve informar um valor maior que zero para sacar');
    }

    const saldo = await checaSaldo(usuario);

    if (saldo < valor) {
        throw new Error('Voce nao possui saldo para sacar esse dinheiro');
    }

    // o saldo total inclui as cryptos, mas o saque em BRL so pode usar os reais
    const saldoEmReais = usuario.moedas.find(m => m.codigo === 'BRL');
    if (!saldoEmReais || saldoEmReais.quantidade < valor) {
        throw new Error('Voce nao possui saldo em reais para sacar esse dinheiro');
    }

    usuario.saques.push({ valor: valor, data: new Date() });
    saldoEmReais.quantidade -= valor;

    await usuario.save();

    return {
        saldo: saldo - valor,
        saques: usuario.saques,
    };
};

module.exports = sacaReais;
