const bcrypt = require('bcrypt');
const jsonWebToken = require('jsonwebtoken');
const { generateSecret, generateSync } = require('otplib');

const logaUsuario = require('../../../services/loga-usuario');
const { Usuario } = require('../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'teste@1234',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste'
};

const salvaUsuario = async (dados = {}) => Usuario.create({
    ...usuarioMock,
    senha: await bcrypt.hash(usuarioMock.senha, 10),
    confirmado: true,
    ...dados,
});

describe('se o email ou a senha não forem informados', () => {
    test('ele dá um erro de campos obrigatórios', async () => {
        await expect(() => logaUsuario(usuarioMock.email, undefined)).rejects.toThrow('Campo senha e email sao obrigatorios');
        await expect(() => logaUsuario(undefined, usuarioMock.senha)).rejects.toThrow('Campo senha e email sao obrigatorios');
    });
});

describe('se o usuário não existir', () => {
    test('ele dá um erro de usuário não encontrado', () => {
        return expect(() => logaUsuario('naoexiste@ebac.com.br', usuarioMock.senha)).rejects.toThrow('Usuario nao encontrado');
    });
});

describe('se o usuário não confirmou a conta', () => {
    test('ele dá um erro pedindo a confirmação', async () => {
        await salvaUsuario({ confirmado: false });

        return expect(() => logaUsuario(usuarioMock.email, usuarioMock.senha)).rejects.toThrow('Usuario nao confirmado');
    });
});

describe('se a senha estiver errada', () => {
    test('ele dá um erro de senha inválida', async () => {
        await salvaUsuario();

        return expect(() => logaUsuario(usuarioMock.email, 'senhaErrada')).rejects.toThrow('Email ou Senha Invalida');
    });
});

describe('se o login estiver correto e o usuário não tiver 2FA', () => {
    test('ele devolve um JWT com o id do usuário', async () => {
        const usuario = await salvaUsuario();

        const jwt = await logaUsuario(usuarioMock.email, usuarioMock.senha);
        const payload = jsonWebToken.verify(jwt, process.env.JWT_SECRET_KEY);

        expect(payload.id).toBe(usuario._id.toString());
    });
});

describe('se o usuário tiver o 2FA ativo', () => {
    const segredo = generateSecret();

    beforeEach(() => salvaUsuario({ segredoOtp: segredo, otpAtivo: true }));

    test('ele dá um erro se o código OTP não for informado', () => {
        return expect(() => logaUsuario(usuarioMock.email, usuarioMock.senha)).rejects.toThrow('Informe o codigo OTP do seu aplicativo autenticador');
    });

    test('ele dá um erro se o código OTP estiver errado', () => {
        const codigoDeOutroSegredo = generateSync({ secret: generateSecret() });

        return expect(() => logaUsuario(usuarioMock.email, usuarioMock.senha, codigoDeOutroSegredo)).rejects.toThrow('Codigo OTP invalido');
    });

    test('ele devolve o JWT se o código OTP estiver certo', async () => {
        const jwt = await logaUsuario(usuarioMock.email, usuarioMock.senha, generateSync({ secret: segredo }));

        expect(jsonWebToken.verify(jwt, process.env.JWT_SECRET_KEY).id).toEqual(expect.any(String));
    });
});

describe('se o usuário gerou o QR Code mas não ativou o 2FA', () => {
    test('ele loga sem pedir o código OTP', async () => {
        await salvaUsuario({ segredoOtp: generateSecret(), otpAtivo: false });

        const jwt = await logaUsuario(usuarioMock.email, usuarioMock.senha);

        expect(jwt).toEqual(expect.any(String));
    });
});
