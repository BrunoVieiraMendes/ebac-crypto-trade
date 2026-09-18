// uma URL de redirecionamento precisa ser absoluta (http:// ou https://),
// senao o navegador trata como caminho relativo e cai dentro da propria API
const ehUrlDeRedirecionamentoValida = (url) =>
  typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim());

module.exports = {
  logger: require('./logger'),
  ehUrlDeRedirecionamentoValida,
};
