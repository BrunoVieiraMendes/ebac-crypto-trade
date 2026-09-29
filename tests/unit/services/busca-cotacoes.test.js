const nock = require('nock');

const { buscaCotacoesOnline, buscaCotacoesNoBanco, buscaCotacoesPorData } = require('../../../services/busca-cotacoes');
const { Cotacao } = require('../../../models');

process.env.COIN_MARKETCAP_URL = 'https://pro-api.coinmarketcap.com';
process.env.COIN_MARKETCAP_KEY = 'chave-de-teste';

// formato devolvido pela CoinMarketCap: cada simbolo aponta para uma lista de moedas
const respostaCoinMarketCap = {
    data: {
        BTC: [{ symbol: 'BTC', quote: { BRL: { price: 350000.12 } } }],
        ETH: [{ symbol: 'ETH', quote: { BRL: { price: 18000.5 } } }],
    },
};

describe('buscaCotacoesOnline', () => {
    beforeAll(() => nock.disableNetConnect());

    afterEach(() => nock.cleanAll());

    afterAll(() => nock.enableNetConnect());

    describe('se a CoinMarketCap responder com sucesso', () => {
        test('ele chama a API com as moedas, o BRL e a chave', async () => {
            const escopo = nock(process.env.COIN_MARKETCAP_URL, {
                reqheaders: { 'X-CMC_PRO_API_KEY': 'chave-de-teste' },
            })
                .get('/v2/cryptocurrency/quotes/latest')
                .query({ symbol: 'BTC,ETH,BNB,XRP,ADA,SOL', convert: 'BRL' })
                .reply(200, respostaCoinMarketCap);

            await buscaCotacoesOnline();

            expect(escopo.isDone()).toBe(true);
        });

        test('ele devolve uma cotação por moeda com a mesma data', async () => {
            nock(process.env.COIN_MARKETCAP_URL)
                .get('/v2/cryptocurrency/quotes/latest')
                .query(true)
                .reply(200, respostaCoinMarketCap);

            const cotacoes = await buscaCotacoesOnline();

            expect(cotacoes).toEqual([
                { moeda: 'BTC', valor: 350000.12, data: expect.any(Date) },
                { moeda: 'ETH', valor: 18000.5, data: expect.any(Date) },
            ]);
            expect(cotacoes[0].data).toBe(cotacoes[1].data);
        });
    });

    describe('se a CoinMarketCap der erro', () => {
        test('ele repassa o erro para o worker tentar de novo', () => {
            nock(process.env.COIN_MARKETCAP_URL)
                .get('/v2/cryptocurrency/quotes/latest')
                .query(true)
                .reply(401, { status: { error_message: 'API key invalida' } });

            return expect(buscaCotacoesOnline()).rejects.toThrow('Request failed with status code 401');
        });
    });
});

describe('buscaCotacoesNoBanco', () => {
    test('ele devolve apenas a cotação mais recente de cada moeda', async () => {
        await Cotacao.create([
            { moeda: 'BTC', valor: 100, data: new Date('2026-09-01T10:00:00Z') },
            { moeda: 'BTC', valor: 300, data: new Date('2026-09-03T10:00:00Z') },
            { moeda: 'BTC', valor: 200, data: new Date('2026-09-02T10:00:00Z') },
            { moeda: 'ETH', valor: 50, data: new Date('2026-09-01T10:00:00Z') },
        ]);

        const cotacoes = await buscaCotacoesNoBanco();
        const porMoeda = Object.fromEntries(cotacoes.map(c => [c.moeda, c]));

        expect(cotacoes).toHaveLength(2);
        expect(porMoeda.BTC.valor).toBe(300);
        expect(porMoeda.ETH.valor).toBe(50);
        expect(porMoeda.BTC.id).toBeDefined();
        expect(porMoeda.BTC._id).toBeUndefined();
    });

    test('ele devolve uma lista vazia se não houver cotações', async () => {
        expect(await buscaCotacoesNoBanco()).toEqual([]);
    });
});

describe('buscaCotacoesPorData', () => {
    test('ele devolve o último valor de cada moeda no dia pedido', async () => {
        await Cotacao.create([
            { moeda: 'BTC', valor: 100, data: new Date('2026-09-10T08:00:00Z') },
            { moeda: 'BTC', valor: 150, data: new Date('2026-09-10T23:00:00Z') },
            { moeda: 'ETH', valor: 20, data: new Date('2026-09-10T12:00:00Z') },
        ]);

        expect(await buscaCotacoesPorData('2026-09-10')).toEqual({ BTC: 150, ETH: 20 });
    });

    test('ele ignora cotações de outros dias', async () => {
        await Cotacao.create([
            { moeda: 'BTC', valor: 100, data: new Date('2026-09-09T23:59:59Z') },
            { moeda: 'BTC', valor: 150, data: new Date('2026-09-10T00:00:00Z') },
            { moeda: 'BTC', valor: 999, data: new Date('2026-09-11T00:00:00Z') },
        ]);

        expect(await buscaCotacoesPorData('2026-09-10')).toEqual({ BTC: 150 });
    });

    test('ele devolve um objeto vazio se não houver cotações no dia', async () => {
        expect(await buscaCotacoesPorData('2026-09-10')).toEqual({});
    });
});
