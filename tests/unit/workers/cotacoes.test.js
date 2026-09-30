const nock = require('nock');

const cotacoesWorker = require('../../../workers/cotacoes');
const { Cotacao } = require('../../../models');

const job = { attemptsMade: 0, opts: { attempts: 3 } };

const respostaCoinMarketCap = {
    data: {
        BTC: [{ symbol: 'BTC', quote: { BRL: { price: 350000 } } }],
        ETH: [{ symbol: 'ETH', quote: { BRL: { price: 18000 } } }],
    },
};

describe('se a CoinMarketCap responder com sucesso', () => {
    test('ele salva as cotações no banco e finaliza o job', async () => {
        nock(process.env.COIN_MARKETCAP_URL)
            .get('/v2/cryptocurrency/quotes/latest')
            .query(true)
            .reply(200, respostaCoinMarketCap);
        const done = jest.fn();

        await cotacoesWorker(job, done);

        expect(done).toHaveBeenCalledWith();

        const cotacoes = await Cotacao.find().sort({ moeda: 1 });
        expect(cotacoes.map(c => [c.moeda, c.valor])).toEqual([['BTC', 350000], ['ETH', 18000]]);
    });
});

describe('se a CoinMarketCap der erro', () => {
    test('ele finaliza o job com o erro para o bull tentar de novo', async () => {
        nock(process.env.COIN_MARKETCAP_URL)
            .get('/v2/cryptocurrency/quotes/latest')
            .query(true)
            .reply(500);
        const done = jest.fn();

        await cotacoesWorker(job, done);

        expect(done).toHaveBeenCalledWith(expect.any(Error));
        expect(await Cotacao.countDocuments()).toBe(0);
    });
});
