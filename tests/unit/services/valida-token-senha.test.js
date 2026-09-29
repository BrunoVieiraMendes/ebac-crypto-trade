const jsonWebToken = require('jsonwebtoken');

const validaTokenSenha = require('../../../services/valida-token-senha');
const { Usuario } = require('../../../models');

process.env.JWT_SECRET_KEY = 'segredo-de-teste';

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    confirmado: true,
    tokenDeRecuperacao: 'token-de-recuperacao',
};

const assinaToken = (payload, opcoes = { expiresIn: '5 minutes' }) =>
    jsonWebToken.sign(payload, process.env.JWT_SECRET_KEY, opcoes);

describe('se o token não for um JWT válido', () => {
    test('ele dá um erro pedindo um novo token', () => {
        return expect(() => validaTokenSenha('nao-e-um-jwt')).rejects.toThrow('Token não encontrado ou expirado. Requisite um novo!');
    });

    test('ele recusa um JWT assinado com outro segredo', () => {
        const token = jsonWebToken.sign({ token: usuarioMock.tokenDeRecuperacao }, 'outro-segredo');

        return expect(() => validaTokenSenha(token)).rejects.toThrow('Token não encontrado ou expirado. Requisite um novo!');
    });
});

describe('se o token estiver expirado', () => {
    test('ele dá um erro pedindo um novo token', async () => {
        await Usuario.create(usuarioMock);
        const token = assinaToken({ token: usuarioMock.tokenDeRecuperacao }, { expiresIn: -10 });

        return expect(() => validaTokenSenha(token)).rejects.toThrow('Token não encontrado ou expirado. Requisite um novo!');
    });
});

describe('se o JWT não tiver o token de recuperação', () => {
    test('ele dá um erro', () => {
        // um JWT de login (so com o id) nao pode ser usado para recuperar senha
        const token = assinaToken({ id: 'qualquer-id' });

        return expect(() => validaTokenSenha(token)).rejects.toThrow('Token não encontrado ou expirado. Requisite um novo!');
    });
});

describe('se o token de recuperação não pertencer a nenhum usuário', () => {
    test('ele dá um erro (link antigo, já substituído por um novo pedido)', async () => {
        await Usuario.create(usuarioMock);
        const token = assinaToken({ token: 'token-antigo' });

        return expect(() => validaTokenSenha(token)).rejects.toThrow('Token não encontrado ou expirado. Requisite um novo!');
    });
});

describe('se o token for válido', () => {
    test('ele devolve um JWT de 15 minutos com o id do usuário', async () => {
        const usuario = await Usuario.create(usuarioMock);
        const token = assinaToken({ token: usuarioMock.tokenDeRecuperacao });

        const jwt = await validaTokenSenha(token);
        const payload = jsonWebToken.verify(jwt, process.env.JWT_SECRET_KEY);

        expect(payload.id).toBe(usuario._id.toString());
        expect(payload.exp - payload.iat).toBe(15 * 60);
    });
});
