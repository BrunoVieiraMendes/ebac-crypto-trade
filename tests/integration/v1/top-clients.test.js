const request = require('supertest');

const app = require('../../../app');
const { TopClients } = require('../../../models');

describe('GET /v1/top-clients', () => {
    describe('se a data não for informada', () => {
        test('ele retorna um 400', () => {
            return request(app)
                .get('/v1/top-clients')
                .expect(400)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: 'Parâmetro "data" é obrigatório.' });
                });
        });
    });

    describe('se não houver relatório na data', () => {
        test('ele retorna um 404', () => {
            return request(app)
                .get('/v1/top-clients')
                .query({ data: '2026-09-29' })
                .expect(404)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, mensagem: 'Nenhum relatório encontrado para essa data.' });
                });
        });
    });

    describe('se houver relatório na data', () => {
        beforeEach(async () => {
            await TopClients.create([
                {
                    dia: '2026-09-29',
                    gainers: [{ usuario: 'Ana', variacao: 30 }, { usuario: 'Bruno', variacao: 10 }],
                    loosers: [{ usuario: 'Carla', variacao: -20 }],
                },
                { dia: '2026-09-28', gainers: [], loosers: [] },
            ]);
        });

        test('ele retorna um 200 com os gainers e loosers do dia', () => {
            return request(app)
                .get('/v1/top-clients')
                .query({ data: '2026-09-29' })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({
                        sucesso: true,
                        relatorio: {
                            dia: '2026-09-29',
                            gainers: [{ usuario: 'Ana', variacao: 30 }, { usuario: 'Bruno', variacao: 10 }],
                            loosers: [{ usuario: 'Carla', variacao: -20 }],
                        },
                    });
                });
        });
    });
});
