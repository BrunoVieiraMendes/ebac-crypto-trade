const { buscaCotacoesNoBanco, buscaCotacoesPorData, analisaCotacoes } = require('./busca-cotacoes');
const { enviaEmailDeConfirmacao } = require('./envia-email');

module.exports = {
    criaUsuario: require('./cria-usuario'),
    logaUsuario: require('./loga-usuario'),
    checaSaldo: require('./checa-saldo'),
    sacaCrypto: require('./saca-crypto'),
    geraPnl: require('./gera-pnl'),
    analisaCotacoes: require('./analisa-cotacoes'),
    trocaMoedas: require('./troca-moedas'),
    confirmaConta: require('./confirma-conta'),
    buscaCotacoesOnline: require('./busca-cotacoes').buscaCotacoesOnline,
    buscaCotacoesNoBanco: require('./busca-cotacoes').buscaCotacoesNoBanco,
    buscaCotacoesPorData: require('./busca-cotacoes').buscaCotacoesPorData,
    enviaEmailDeConfirmacao: require('./envia-email').enviaEmailDeConfirmacao,   
};