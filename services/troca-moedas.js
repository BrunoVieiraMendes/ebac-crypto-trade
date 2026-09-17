const { Cotacao, Corretora } = require('../models');
const { CNPJ, TAXA_DE_TROCA } = require('../constants');

const buscaCotacao = async(cotacaoId) => {
    const cotacao = await Cotacao.findOne({
        _id: cotacaoId,
        data: {
            $gte: new Date((new Date()).valueOf() - 60000 * 15),
        }
    });

    if(!cotacao) {
        throw new Error('Cotacao invalida ou expirada!');
    }

    return cotacao;

};

const trocaMoedas = async(usuario, cotacaoId, quantidade, operacao) => {
    if (!quantidade || !operacao) {
        throw new Error('Voce deve informar a quantidade desejada e a operacao (compra ou venda) desejada');
    }

    if (operacao !== 'compra' && operacao !== 'venda') {
        throw new Error('Operacao invalida! Use compra ou venda');
    }

    if (typeof quantidade !== 'number' || quantidade <= 0) {
        throw new Error('A quantidade deve ser um numero maior que zero');
    }

    // essa cotacao existe ? 
    const cotacaoValida = await buscaCotacao(cotacaoId);

    // a corretora tem saldo ?
    const reaisNecessarios = (cotacaoValida.valor * quantidade);
    const corretora = await Corretora.findOne({ cnpj: CNPJ });
    if (!corretora) {
        throw new Error('Corretora nao encontrada! Rode o seed do banco');
    }

    if (corretora.caixa < reaisNecessarios) {
        throw new Error('Valor muito grande, nao temos caixa no momento para essa operacao');
    }

    // o usuario tem saldo para isso ?
    const moedaEmReais = usuario.moedas.find(m => m.codigo === 'BRL');
    const moedaEmCrypto = usuario.moedas.find(m => m.codigo === cotacaoValida.moeda);
    const taxaCorretora = TAXA_DE_TROCA * quantidade;

    if (operacao === 'compra') {
        if (!moedaEmReais || moedaEmReais.quantidade < reaisNecessarios) {
            throw new Error('Voce nao possui saldo o suficiente para essa operacao! deposite mais dinheiro');
        }

        moedaEmReais.quantidade -= reaisNecessarios;

        if (moedaEmCrypto) {
            moedaEmCrypto.quantidade += (quantidade - taxaCorretora);
        } else {
            usuario.moedas.push({
                codigo: cotacaoValida.moeda,
                quantidade: quantidade - taxaCorretora,
            });
        }

    } else {
        if (!moedaEmCrypto || moedaEmCrypto.quantidade < quantidade) {
            throw new Error('Voce nao possui saldo o suficiente para essa operacao! Compre mais cryptos!');
        }
        
        const reaisRecebidos = reaisNecessarios - taxaCorretora * cotacaoValida.valor;
        if (moedaEmReais) {
            moedaEmReais.quantidade += reaisRecebidos;
        } else {
            usuario.moedas.push({ codigo: 'BRL', quantidade: reaisRecebidos });
        }
        moedaEmCrypto.quantidade -= quantidade;
    }
    await usuario.save();

    corretora.caixa += taxaCorretora * cotacaoValida.valor;
    await corretora.save();

    return usuario.moedas;
};

module.exports = trocaMoedas;