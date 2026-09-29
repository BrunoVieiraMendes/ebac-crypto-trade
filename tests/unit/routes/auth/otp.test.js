const { generateSecret, generateSync } = require('otplib');

const { checaOtp } = require('../../../../routes/v1/auth/otp');
const { Usuario } = require('../../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    confirmado: true,
};

// simula o req/res do express com o usuario ja autenticado pelo passport
const montaRequest = (usuario, totp) => ({
    isAuthenticated: () => Boolean(usuario),
    user: usuario,
    get: (header) => (header === 'totp' ? totp : undefined),
});

const montaResponse = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

describe('se o usuário não estiver autenticado', () => {
    test('ele responde 401 pedindo login', async () => {
        const res = montaResponse();
        const next = jest.fn();

        await checaOtp(montaRequest(undefined, '123456'), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ sucesso: false, erro: 'Para prosseguir faca login' });
    });
});

describe('se o usuário tiver o 2FA ativo', () => {
    const segredo = generateSecret();
    let usuario;

    beforeEach(async () => {
        usuario = await Usuario.create({ ...usuarioMock, segredoOtp: segredo, otpAtivo: true });
    });

    test('ele deixa passar com o código certo no header totp', async () => {
        const res = montaResponse();
        const next = jest.fn();

        await checaOtp(montaRequest(usuario, generateSync({ secret: segredo })), res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('ele responde 401 com o código errado', async () => {
        const res = montaResponse();
        const next = jest.fn();

        await checaOtp(montaRequest(usuario, generateSync({ secret: generateSecret() })), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('ele responde 401 sem o header totp', async () => {
        const res = montaResponse();
        const next = jest.fn();

        await checaOtp(montaRequest(usuario, undefined), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('se o usuário gerou o QR Code mas não ativou o 2FA', () => {
    test('ele responde 401 mesmo com o código certo', async () => {
        const segredo = generateSecret();
        const usuario = await Usuario.create({ ...usuarioMock, segredoOtp: segredo, otpAtivo: false });
        const res = montaResponse();
        const next = jest.fn();

        await checaOtp(montaRequest(usuario, generateSync({ secret: segredo })), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('se o usuário não tiver 2FA', () => {
    test('ele responde 401 dizendo que o OTP não está configurado', async () => {
        const usuario = await Usuario.create(usuarioMock);
        const res = montaResponse();
        const next = jest.fn();

        await checaOtp(montaRequest(usuario, '123456'), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json.mock.calls[0][0].erro).toMatch('OTP inválido ou não configurado!');
    });
});
