const request = require('supertest');

const app = require('../../../app');
const { Cotacao } = require('../../../models');
const { checaAutenticacao } = require('./shared/autenticacao');
const { criaUsuarioLogado } = require('./shared/usuario');

// o saldo do usuario e devolvido pela rota de perfil
describe('GET /v1/usuarios/me (saldo)', () => {
    checaAutenticacao('/v1/usuarios/me');

    const buscaPerfil = (jwt) => request(app)
        .get('/v1/usuarios/me')
        .set('Authorization', `Bearer ${jwt}`);

    describe('se o usuário não tem moedas', () => {
        test('ele retorna um 200 com saldo zero', async () => {
            const { jwt } = await criaUsuarioLogado();

            return buscaPerfil(jwt)
                .expect(200)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(true);
                    expect(resposta.body.saldo).toBe(0);
                });
        });
    });

    describe('se o usuário tem apenas reais', () => {
        test('ele retorna o saldo em BRL', async () => {
            const { jwt } = await criaUsuarioLogado({ moedas: [{ codigo: 'BRL', quantidade: 1234.5 }] });

            return buscaPerfil(jwt).then(resposta => {
                expect(resposta.body.saldo).toBe(1234.5);
            });
        });
    });

    describe('se o usuário tem cryptos', () => {
        test('ele converte cada crypto pela cotação mais recente e soma com os reais', async () => {
            const { jwt } = await criaUsuarioLogado({
                moedas: [
                    { codigo: 'BRL', quantidade: 100 },
                    { codigo: 'BTC', quantidade: 2 },
                    { codigo: 'ETH', quantidade: 10 },
                ],
            });
            await Cotacao.create([
                { moeda: 'BTC', valor: 900, data: new Date('2026-09-01') },
                { moeda: 'BTC', valor: 1000, data: new Date('2026-09-02') },
                { moeda: 'ETH', valor: 50, data: new Date('2026-09-02') },
            ]);

            return buscaPerfil(jwt).then(resposta => {
                expect(resposta.body.saldo).toBe(100 + 2 * 1000 + 10 * 50);
            });
        });
    });

    describe('se existem outros usuários com saldo', () => {
        test('ele retorna apenas o saldo do usuário logado', async () => {
            const { jwt } = await criaUsuarioLogado({ moedas: [{ codigo: 'BRL', quantidade: 100 }] });
            await criaUsuarioLogado({ moedas: [{ codigo: 'BRL', quantidade: 99999 }] });

            return buscaPerfil(jwt).then(resposta => {
                expect(resposta.body.saldo).toBe(100);
            });
        });
    });

    describe('o perfil devolvido', () => {
        test('ele traz os dados do usuário', async () => {
            const { usuario, jwt } = await criaUsuarioLogado();

            return buscaPerfil(jwt).then(resposta => {
                expect(resposta.body.usuario._id).toBe(usuario._id.toString());
                expect(resposta.body.usuario.email).toBe(usuario.email);
                expect(resposta.body.usuario.otpAtivo).toBe(false);
            });
        });

        test('ele nunca devolve a senha, os tokens nem o segredo do 2FA', async () => {
            const { jwt } = await criaUsuarioLogado({
                tokenDeConfirmacao: 'token-confirmacao',
                tokenDeRecuperacao: 'token-recuperacao',
                segredoOtp: 'SEGREDO',
            });

            return buscaPerfil(jwt).then(resposta => {
                expect(resposta.body.usuario).not.toHaveProperty('senha');
                expect(resposta.body.usuario).not.toHaveProperty('tokenDeConfirmacao');
                expect(resposta.body.usuario).not.toHaveProperty('tokenDeRecuperacao');
                expect(resposta.body.usuario).not.toHaveProperty('segredoOtp');
            });
        });
    });
});
