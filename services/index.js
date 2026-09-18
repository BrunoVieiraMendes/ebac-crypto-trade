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
    validaTokenAlteracaoDeSenha: require('./valida-token-senha'),
    geraSegredo: require('./otp').geraSegredo,
    validaOtp: require('./otp').validaOtp,
    analisaLucroEmTrade: require('./analisa-lucro'),
    buscaCotacoesOnline: require('./busca-cotacoes').buscaCotacoesOnline,
    buscaCotacoesNoBanco: require('./busca-cotacoes').buscaCotacoesNoBanco,
    buscaCotacoesPorData: require('./busca-cotacoes').buscaCotacoesPorData,
    enviaEmailDeConfirmacao: require('./envia-email').enviaEmailDeConfirmacao,
    enviaEmailDeRecuperacao: require('./envia-email').enviaEmailDeRecuperacao,
    enviaEmailDeParabenizacao: require('./envia-email').enviaEmailDeParabenizacao,
};