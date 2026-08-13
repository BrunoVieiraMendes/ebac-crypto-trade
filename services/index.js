const { buscaCotacoesNoBanco, buscaCotacoesPorData, analisaCotacoes } = require('./busca-cotacoes');

module.exports = {
    criaUsuario: require('./cria-usuario'),
    logaUsuario: require('./loga-usuario'),
    checaSaldo: require('./checa-saldo'),
    buscaCotacoesOnline: require('./busca-cotacoes').buscaCotacoesOnline,
    buscaCotacoesNoBanco: require('./busca-cotacoes').buscaCotacoesNoBanco,
    buscaCotacoesPorData: require('./busca-cotacoes').buscaCotacoesPorData,
    analisaCotacoes: require('./analisa-cotacoes'),
    trocaMoedas: require('./troca-moedas'),
};