const request = require('supertest');

const app = require('../../../app');
const { Usuario, Cotacao } = require('../../../models');
const { checaAutenticacao } = require('./shared/autenticacao');
const { checaOtp } = require('./shared/otp');
const { criaUsuarioLogado, criaUsuarioCom2fa } = require('./shared/usuario');

const reaisNoBanco = async (usuario) => (await Usuario.findById(usuario._id)).moedas.find(m => m.codigo === 'BRL').quantidade;

describe('GET /v1/saques', () => {
    checaAutenticacao('/v1/saques');

    describe('se o usuário não fez saques', () => {
        test('ele retorna um 200 com a lista vazia', async () => {
            const { jwt } = await criaUsuarioLogado();

            return request(app)
                .get('/v1/saques')
                .set('Authorization', `Bearer ${jwt}`)
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, saques: [] });
                });
        });
    });

    describe('se o usuário fez saques', () => {
        test('ele retorna o histórico de saques', async () => {
            const { jwt } = await criaUsuarioLogado({
                saques: [
                    { valor: 100, data: new Date('2026-09-01') },
                    { valor: 50, data: new Date('2026-09-02') },
                ],
            });

            return request(app)
                .get('/v1/saques')
                .set('Authorization', `Bearer ${jwt}`)
                .then(resposta => {
                    expect(resposta.body.saques.map(s => s.valor)).toEqual([100, 50]);
                });
        });
    });
});

describe('POST /v1/saques', () => {
    checaAutenticacao('/v1/saques', 'post');
    checaOtp('/v1/saques', 'post', { valor: 100 });

    let usuario, jwt, geraOtp;

    beforeEach(async () => {
        ({ usuario, jwt, geraOtp } = await criaUsuarioCom2fa({ moedas: [{ codigo: 'BRL', quantidade: 1000 }] }));
    });

    const saca = (corpo) => request(app)
        .post('/v1/saques')
        .set('Authorization', `Bearer ${jwt}`)
        .set('totp', geraOtp())
        .send(corpo);

    describe('se o usuário tiver saldo em reais', () => {
        test('ele retorna um 200 com o saldo restante e o saque registrado', () => {
            return saca({ valor: 300 })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(true);
                    expect(resposta.body.saldo).toBe(700);
                    expect(resposta.body.saques).toHaveLength(1);
                    expect(resposta.body.saques[0].valor).toBe(300);
                });
        });

        test('ele debita os reais no banco', async () => {
            await saca({ valor: 300 });

            expect(await reaisNoBanco(usuario)).toBe(700);
        });
    });

    describe('se o usuário não tiver saldo suficiente', () => {
        test('ele retorna um 422 com o erro de saldo', () => {
            return saca({ valor: 5000 })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({
                        sucesso: false,
                        erro: 'Voce nao possui saldo para sacar esse dinheiro',
                    });
                });
        });

        test('ele não altera o saldo', async () => {
            await saca({ valor: 5000 });

            expect(await reaisNoBanco(usuario)).toBe(1000);
        });
    });

    describe('se o saldo total der, mas o saldo em reais não', () => {
        test('ele retorna um 422 com o erro de saldo em reais', async () => {
            await Usuario.updateOne({ _id: usuario._id }, { $push: { moedas: { codigo: 'BTC', quantidade: 1 } } });
            await Cotacao.create({ moeda: 'BTC', valor: 5000, data: new Date() });

            return saca({ valor: 2000 })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Voce nao possui saldo em reais para sacar esse dinheiro');
                });
        });
    });

    describe('se o valor for inválido', () => {
        test.each([
            ['não informado', {}],
            ['zero', { valor: 0 }],
            ['negativo', { valor: -10 }],
            ['em texto', { valor: '100' }],
        ])('ele retorna um 422 com o valor %s', (_descricao, corpo) => {
            return saca(corpo)
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Voce deve informar um valor maior que zero para sacar');
                });
        });
    });
});

describe('POST /v1/saques/:codigo', () => {
    checaAutenticacao('/v1/saques/BTC', 'post');

    let usuario, jwt;

    beforeEach(async () => {
        ({ usuario, jwt } = await criaUsuarioLogado({
            moedas: [
                { codigo: 'BRL', quantidade: 1000 },
                { codigo: 'BTC', quantidade: 2 },
            ],
        }));
    });

    const sacaCrypto = (codigo, corpo) => request(app)
        .post(`/v1/saques/${codigo}`)
        .set('Authorization', `Bearer ${jwt}`)
        .send(corpo);

    describe('se o usuário tiver a moeda com saldo suficiente', () => {
        test('ele retorna um 200 com a carteira atualizada', () => {
            return sacaCrypto('BTC', { valor: 0.5 })
                .expect(200)
                .then(resposta => {
                    const btc = resposta.body.moedas.find(m => m.codigo === 'BTC');
                    const brl = resposta.body.moedas.find(m => m.codigo === 'BRL');

                    expect(resposta.body.sucesso).toBe(true);
                    expect(btc.quantidade).toBe(1.5);
                    expect(brl.quantidade).toBe(1000);
                });
        });

        test('ele salva a carteira no banco', async () => {
            await sacaCrypto('BTC', { valor: 2 });

            const btc = (await Usuario.findById(usuario._id)).moedas.find(m => m.codigo === 'BTC');
            expect(btc.quantidade).toBe(0);
        });
    });

    describe('se o usuário não tiver saldo suficiente', () => {
        test('ele retorna um 422', () => {
            return sacaCrypto('BTC', { valor: 3 })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({
                        sucesso: false,
                        erro: 'Voce nao possui saldo para sacar esse valor!',
                    });
                });
        });
    });

    describe('se o usuário não tiver a moeda', () => {
        test('ele retorna um 422', () => {
            return sacaCrypto('ETH', { valor: 1 })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Voce nao possui saldo para sacar esse valor!');
                });
        });
    });

    describe('se o valor for inválido', () => {
        test.each([
            ['não informado', {}],
            ['zero', { valor: 0 }],
            ['negativo', { valor: -1 }],
            ['em texto', { valor: '1' }],
        ])('ele retorna um 422 com o valor %s', (_descricao, corpo) => {
            return sacaCrypto('BTC', corpo)
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Voce deve informar um valor maior que zero para sacar');
                });
        });
    });
});
