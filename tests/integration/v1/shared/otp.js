const request = require('supertest');
const { generateSecret, generateSync } = require('otplib');

const app = require('../../../../app');
const { criaUsuarioLogado, criaUsuarioCom2fa } = require('./usuario');

const ERRO_OTP = 'OTP inválido ou não configurado! Essa rota necessita da configuracao e uso do OTP enviado por Headers';

// testes das rotas protegidas pelo middleware checaOtp (header totp)
const checaOtp = (rota, metodo = 'post', corpo = {}) => {
    describe('se o usuário não tem o 2FA configurado', () => {
        test('ele retorna um 401 com o erro de OTP', async () => {
            const { jwt } = await criaUsuarioLogado();

            return request(app)
                [metodo](rota)
                .set('Authorization', `Bearer ${jwt}`)
                .set('totp', '123456')
                .send(corpo)
                .expect(401)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: ERRO_OTP });
                });
        });
    });

    describe('se o usuário gerou o QR Code mas não ativou o 2FA', () => {
        test('ele retorna um 401 mesmo com o código certo', async () => {
            const segredo = generateSecret();
            const { jwt } = await criaUsuarioLogado({ segredoOtp: segredo, otpAtivo: false });

            return request(app)
                [metodo](rota)
                .set('Authorization', `Bearer ${jwt}`)
                .set('totp', generateSync({ secret: segredo }))
                .send(corpo)
                .expect(401);
        });
    });

    describe('se o usuário tem o 2FA ativo', () => {
        test('ele retorna um 401 sem o header totp', async () => {
            const { jwt } = await criaUsuarioCom2fa();

            return request(app)
                [metodo](rota)
                .set('Authorization', `Bearer ${jwt}`)
                .send(corpo)
                .expect(401)
                .then(resposta => {
                    expect(resposta.body.erro).toBe(ERRO_OTP);
                });
        });

        test('ele retorna um 401 com um código errado', async () => {
            const { jwt } = await criaUsuarioCom2fa();
            const codigoDeOutroSegredo = generateSync({ secret: generateSecret() });

            return request(app)
                [metodo](rota)
                .set('Authorization', `Bearer ${jwt}`)
                .set('totp', codigoDeOutroSegredo)
                .send(corpo)
                .expect(401);
        });
    });
};

module.exports = {
    checaOtp,
};
