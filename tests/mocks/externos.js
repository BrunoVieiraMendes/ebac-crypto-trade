// Mocks de tudo que sai do processo, carregados antes de cada arquivo de teste
// (unitarios e de integracao). Nenhum teste deve depender de servico externo.
const nock = require('nock');

const logger = require('../../utils/logger');

// E-mail: nenhum teste envia e-mail de verdade. Para conferir o que seria enviado:
//   const sendMail = require('nodemailer').createTransport().sendMail;
jest.mock('nodemailer', () => {
    const sendMail = jest.fn().mockResolvedValue({});
    return { createTransport: jest.fn(() => ({ sendMail })) };
});

// Redis: as filas do bull nunca conectam, mesmo se algum teste importar os workers
jest.mock('bull');

// Internet: bloqueia qualquer requisicao HTTP externa (ex. CoinMarketCap).
// Quem precisar de uma API externa simula a resposta com o nock.
// Liberados: o servidor local do supertest e o download do binario do
// mongodb-memory-server (so acontece na primeira execucao da maquina).
beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(host => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || /mongodb\.org(:\d+)?$/.test(host));
});

afterEach(() => {
    nock.cleanAll();
});

// cada arquivo de teste recebe uma copia nova do nock, mas a interceptacao do
// http e global no processo: sem o restore, a copia do arquivo anterior continua
// ativa e recusa as requisicoes que o proximo arquivo simulou
afterAll(() => {
    nock.enableNetConnect();
    nock.restore();
});

// os logs dos services e workers so poluem a saida dos testes
logger.silent = true;
