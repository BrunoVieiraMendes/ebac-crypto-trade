const request = require('supertest');

const app = require('../../../app');
const { Usuario, Cotacao, Corretora } = require('../../../models');
const { CNPJ, TAXA_DE_TROCA } = require('../../../constants');
const { checaAutenticacao } = require('./shared/autenticacao');
const { criaUsuarioLogado } = require('./shared/usuario');

const VALOR_DO_BTC = 100;

const quantidadeDe = (moedas, codigo) => moedas.find(m => m.codigo === codigo)?.quantidade;

describe('POST /v1/trocas', () => {
    checaAutenticacao('/v1/trocas', 'post');

    let usuario, jwt, cotacao;

    beforeEach(async () => {
        ({ usuario, jwt } = await criaUsuarioLogado({
            moedas: [
                { codigo: 'BRL', quantidade: 1000 },
                { codigo: 'BTC', quantidade: 2 },
            ],
        }));
        cotacao = await Cotacao.create({ moeda: 'BTC', valor: VALOR_DO_BTC, data: new Date() });
        await Corretora.create({ cnpj: CNPJ, caixa: 100000 });
    });

    const troca = (corpo) => request(app)
        .post('/v1/trocas')
        .set('Authorization', `Bearer ${jwt}`)
        .send(corpo);

    describe('se o usuário comprar crypto com saldo suficiente', () => {
        test('ele retorna um 200 com a carteira atualizada, descontando a taxa', () => {
            return troca({ cotacaoId: cotacao._id, quantidade: 1, operacao: 'compra' })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(true);
                    expect(quantidadeDe(resposta.body.moedas, 'BRL')).toBeCloseTo(1000 - VALOR_DO_BTC);
                    expect(quantidadeDe(resposta.body.moedas, 'BTC')).toBeCloseTo(2 + 1 - TAXA_DE_TROCA);
                });
        });

        test('ele salva a carteira e a taxa da corretora no banco', async () => {
            await troca({ cotacaoId: cotacao._id, quantidade: 1, operacao: 'compra' });

            expect(quantidadeDe((await Usuario.findById(usuario._id)).moedas, 'BRL')).toBeCloseTo(900);
            expect((await Corretora.findOne({ cnpj: CNPJ })).caixa).toBeCloseTo(100000 + TAXA_DE_TROCA * VALOR_DO_BTC);
        });
    });

    describe('se o usuário vender crypto com saldo suficiente', () => {
        test('ele retorna um 200 com os reais creditados, descontando a taxa', () => {
            return troca({ cotacaoId: cotacao._id, quantidade: 1, operacao: 'venda' })
                .expect(200)
                .then(resposta => {
                    expect(quantidadeDe(resposta.body.moedas, 'BTC')).toBeCloseTo(1);
                    expect(quantidadeDe(resposta.body.moedas, 'BRL')).toBeCloseTo(1000 + VALOR_DO_BTC - TAXA_DE_TROCA * VALOR_DO_BTC);
                });
        });
    });

    describe('se a troca não puder ser feita', () => {
        test.each([
            ['sem quantidade', { operacao: 'compra' }, 'Voce deve informar a quantidade desejada e a operacao (compra ou venda) desejada'],
            ['sem operação', { quantidade: 1 }, 'Voce deve informar a quantidade desejada e a operacao (compra ou venda) desejada'],
            ['com operação inválida', { quantidade: 1, operacao: 'emprestimo' }, 'Operacao invalida! Use compra ou venda'],
            ['com quantidade negativa', { quantidade: -1, operacao: 'compra' }, 'A quantidade deve ser um numero maior que zero'],
            ['comprando sem reais suficientes', { quantidade: 11, operacao: 'compra' }, 'Voce nao possui saldo o suficiente para essa operacao! deposite mais dinheiro'],
            ['vendendo sem crypto suficiente', { quantidade: 3, operacao: 'venda' }, 'Voce nao possui saldo o suficiente para essa operacao! Compre mais cryptos!'],
        ])('ele retorna um 422 %s', (_descricao, corpo, erro) => {
            return troca({ cotacaoId: cotacao._id, ...corpo })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro });
                });
        });

        test('ele retorna um 422 com cotação expirada', async () => {
            const cotacaoVelha = await Cotacao.create({ moeda: 'BTC', valor: VALOR_DO_BTC, data: new Date(Date.now() - 20 * 60000) });

            return troca({ cotacaoId: cotacaoVelha._id, quantidade: 1, operacao: 'compra' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Cotacao invalida ou expirada!');
                });
        });

        test('ele retorna um 422 se a corretora não tiver caixa', async () => {
            await Corretora.updateOne({ cnpj: CNPJ }, { caixa: 10 });

            return troca({ cotacaoId: cotacao._id, quantidade: 1, operacao: 'compra' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Valor muito grande, nao temos caixa no momento para essa operacao');
                });
        });

        test('ele não altera a carteira quando falha', async () => {
            await troca({ cotacaoId: cotacao._id, quantidade: 11, operacao: 'compra' });

            const moedas = (await Usuario.findById(usuario._id)).moedas;
            expect(quantidadeDe(moedas, 'BRL')).toBe(1000);
            expect(quantidadeDe(moedas, 'BTC')).toBe(2);
        });
    });
});
