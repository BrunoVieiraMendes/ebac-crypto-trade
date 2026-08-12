const axios = require('axios');
const { Cotacao } = require('../models');

const buscaCotacoesOnline = async() => {
    const url = `${process.env.COIN_MARKETCAP_URL}/v2/cryptocurrency/quotes/latest`;

    const { data } = await axios.get(url, {
        params: {
            symbol: 'BTC,ETH,BNB,XRP,ADA,SOL',
            convert: 'BRL'
        },
        headers: {
            'X-CMC_PRO_API_KEY': process.env.COIN_MARKETCAP_KEY
        }
    });

    const dataDaCotacao = new Date();

    const info = Object.values(data.data);

    return info.map(([cotacao]) => ({
        moeda: cotacao.symbol,
        valor: cotacao.quote.BRL.price,
        data: dataDaCotacao,
    }));
};

const buscaCotacoesNoBanco = async () => {
    return await Cotacao.aggregate([
        { "$sort": { "data": -1} },
        {
            "$group": {
                "_id": { "moeda": "$moeda" },
                "data": { "$first": "$data" },
                "moeda": { "$first": "$moeda" },
                "valor": { "$first": "$valor" },
                "id": { "$first": "$_id" },
            }
        },
        { "$unset": "_id"}
    ]);
};



const buscaCotacoesPorData = async (dataString) => {
    const inicioDoDia = new Date(`${dataString}T00:00:00.000Z`);
    const fimDoDia = new Date(`${dataString}T23:59:59.999Z`);

    const resultados = await Cotacao.aggregate([
        { $match: { data: { $gte: inicioDoDia, $lte: fimDoDia } } },
        { $sort: { data: -1 } }, // Ordena do mais recente para o mais antigo do dia
        { $group: { _id: "$moeda", ultimoValor: { $first: "$valor" } } }
    ]);

    // Converte de array [{_id: 'BTC', ultimoValor: 50000}, ...] para { 'BTC': 50000 }
    const dicionario = {};
    resultados.forEach(item => {
        dicionario[item._id] = item.ultimoValor;
    });
    return dicionario;
};

// A lógica de negócio 
const analisaCotacoes = (cotacoesOntem, cotacoesHoje, dataReferencia) => {
    const variacoes = [];

    for (const moeda in cotacoesHoje) {
        if (cotacoesOntem[moeda]) {
            const precoHoje = cotacoesHoje[moeda];
            const precoOntem = cotacoesOntem[moeda];
            const variacao = ((precoHoje - precoOntem) / precoOntem) * 100;
            
            variacoes.push({
                moeda: moeda,
                variacao: Number(variacao.toFixed(2))
            });
        }
    }

    variacoes.sort((a, b) => b.variacao - a.variacao);

    return {
        dia: dataReferencia,
        gainers: variacoes.slice(0, 3),
        loosers: variacoes.slice(-3).sort((a, b) => a.variacao - b.variacao)
    };
};

module.exports = { 
    buscaCotacoesOnline,
    buscaCotacoesNoBanco,
    buscaCotacoesPorData,
};