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

    const topGainers = variacoes.slice(0, 3);
    const topLoosers = variacoes.slice(-3);
    
    topLoosers.sort((a, b) => a.variacao - b.variacao);

    return {
        dia: dataReferencia,
        gainers: topGainers,
        loosers: topLoosers
    };
};

module.exports = analisaCotacoes;