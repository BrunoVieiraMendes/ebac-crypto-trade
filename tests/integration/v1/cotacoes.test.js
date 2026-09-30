const request = require('supertest');

const app = require('../../../app');
const { Cotacao } = require('../../../models');

describe('GET /v1/cotacoes', () => {
    describe('se não houver cotações', () => {
        test('ele retorna um 200 com a lista vazia', () => {
            return request(app)
                .get('/v1/cotacoes')
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, cotacoes: [] });
                });
        });
    });

    describe('se houver cotações', () => {
        beforeEach(async () => {
            await Cotacao.create([
                { moeda: 'BTC', valor: 100, data: new Date('2026-09-01T10:00:00Z') },
                { moeda: 'BTC', valor: 300, data: new Date('2026-09-03T10:00:00Z') },
                { moeda: 'ETH', valor: 50, data: new Date('2026-09-02T10:00:00Z') },
            ]);
        });

        test('ele não exige login', () => {
            return request(app)
                .get('/v1/cotacoes')
                .expect(200);
        });

        test('ele retorna apenas a cotação mais recente de cada moeda', () => {
            return request(app)
                .get('/v1/cotacoes')
                .then(resposta => {
                    const porMoeda = Object.fromEntries(resposta.body.cotacoes.map(c => [c.moeda, c]));

                    expect(resposta.body.cotacoes).toHaveLength(2);
                    expect(porMoeda.BTC.valor).toBe(300);
                    expect(porMoeda.ETH.valor).toBe(50);
                });
        });

        test('cada cotação traz o id usado na troca de moedas', () => {
            return request(app)
                .get('/v1/cotacoes')
                .then(resposta => {
                    for (const cotacao of resposta.body.cotacoes) {
                        expect(cotacao).toEqual(expect.objectContaining({
                            id: expect.any(String),
                            moeda: expect.any(String),
                            valor: expect.any(Number),
                            data: expect.any(String),
                        }));
                    }
                });
        });
    });
});
