const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../../../app');
const { Usuario } = require('../../../models');
const { checaAutenticacao } = require('./shared/autenticacao');
const { checaOtp } = require('./shared/otp');
const { criaUsuarioLogado, criaUsuarioCom2fa } = require('./shared/usuario');

describe('GET /v1/depositos', () => {
    checaAutenticacao('/v1/depositos');

    describe('se o usuário não fez depósitos', () => {
        test('ele retorna um 200 com a lista vazia', async () => {
            const { jwt } = await criaUsuarioLogado();

            return request(app)
                .get('/v1/depositos')
                .set('Authorization', `Bearer ${jwt}`)
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, depositos: [] });
                });
        });
    });

    describe('se o usuário fez depósitos', () => {
        test('ele retorna o histórico de depósitos', async () => {
            const { jwt } = await criaUsuarioLogado({
                depositos: [
                    { valor: 100, data: new Date('2026-09-01') },
                    { valor: 500, data: new Date('2026-09-02'), cancelado: true },
                ],
            });

            return request(app)
                .get('/v1/depositos')
                .set('Authorization', `Bearer ${jwt}`)
                .then(resposta => {
                    expect(resposta.body.depositos.map(d => [d.valor, d.cancelado])).toEqual([[100, false], [500, true]]);
                });
        });
    });
});

describe('POST /v1/depositos', () => {
    checaAutenticacao('/v1/depositos', 'post');
    checaOtp('/v1/depositos', 'post', { valor: 100 });

    let usuario, jwt, geraOtp;

    beforeEach(async () => {
        ({ usuario, jwt, geraOtp } = await criaUsuarioCom2fa({ moedas: [{ codigo: 'BRL', quantidade: 1000 }] }));
    });

    const deposita = (corpo) => request(app)
        .post('/v1/depositos')
        .set('Authorization', `Bearer ${jwt}`)
        .set('totp', geraOtp())
        .send(corpo);

    describe('se o valor for válido e o código do 2FA estiver certo', () => {
        test('ele retorna um 200 com o novo saldo e o depósito registrado', () => {
            return deposita({ valor: 250 })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(true);
                    expect(resposta.body.saldo).toBe(1250);
                    expect(resposta.body.depositos).toHaveLength(1);
                    expect(resposta.body.depositos[0]).toEqual(expect.objectContaining({ valor: 250, cancelado: false }));
                });
        });

        test('ele salva o saldo no banco', async () => {
            await deposita({ valor: 250 });

            const brl = (await Usuario.findById(usuario._id)).moedas.find(m => m.codigo === 'BRL');
            expect(brl.quantidade).toBe(1250);
        });
    });

    describe('se o valor for menor que o mínimo de 100', () => {
        test('ele retorna um 422 e não altera o saldo', async () => {
            await deposita({ valor: 50 })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(false);
                    expect(resposta.body.erro).toMatch('is less than minimum allowed value (100)');
                });

            const usuarioNoBanco = await Usuario.findById(usuario._id);
            expect(usuarioNoBanco.depositos).toHaveLength(0);
            expect(usuarioNoBanco.moedas[0].quantidade).toBe(1000);
        });
    });

    describe('se o valor for inválido', () => {
        test.each([
            ['não informado', {}],
            ['zero', { valor: 0 }],
            ['negativo', { valor: -100 }],
            ['em texto', { valor: '100' }],
        ])('ele retorna um 422 com o valor %s', (_descricao, corpo) => {
            return deposita(corpo)
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Voce deve informar um valor maior que zero para depositar');
                });
        });
    });
});

describe('PATCH /v1/depositos/:id/cancelar', () => {
    const idQualquer = new mongoose.Types.ObjectId().toString();

    checaAutenticacao(`/v1/depositos/${idQualquer}/cancelar`, 'patch');

    let usuario, jwt;

    beforeEach(async () => {
        ({ usuario, jwt } = await criaUsuarioLogado({
            moedas: [{ codigo: 'BRL', quantidade: 100 }],
            depositos: [
                { valor: 100, data: new Date() },
                { valor: 200, data: new Date(), cancelado: true },
            ],
        }));
    });

    const cancela = (id) => request(app)
        .patch(`/v1/depositos/${id}/cancelar`)
        .set('Authorization', `Bearer ${jwt}`);

    describe('se o depósito existir e não estiver cancelado', () => {
        test('ele retorna um 200 com o depósito cancelado', () => {
            const id = usuario.depositos[0]._id;

            return cancela(id)
                .expect(200)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(true);
                    expect(resposta.body.depositos.find(d => d._id === id.toString()).cancelado).toBe(true);
                    expect(resposta.body).toHaveProperty('saldo');
                });
        });

        test('ele salva o cancelamento no banco', async () => {
            const id = usuario.depositos[0]._id;

            await cancela(id);

            expect((await Usuario.findById(usuario._id)).depositos.id(id).cancelado).toBe(true);
        });
    });

    describe('se o depósito já estiver cancelado', () => {
        test('ele retorna um 422', () => {
            return cancela(usuario.depositos[1]._id)
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: 'Deposito ja cancelado' });
                });
        });
    });

    describe('se o depósito não existir', () => {
        test('ele retorna um 404', () => {
            return cancela(idQualquer)
                .expect(404)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: 'Deposito nao encontrado' });
                });
        });
    });

    describe('se o depósito for de outro usuário', () => {
        test('ele retorna um 404 e não cancela', async () => {
            const { usuario: outro } = await criaUsuarioLogado({ depositos: [{ valor: 100, data: new Date() }] });
            const idDoOutro = outro.depositos[0]._id;

            await cancela(idDoOutro).expect(404);

            expect((await Usuario.findById(outro._id)).depositos.id(idDoOutro).cancelado).toBe(false);
        });
    });
});
