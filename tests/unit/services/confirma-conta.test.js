const confirmaConta = require('../../../services/confirma-conta');
const { Usuario } = require('../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    tokenDeConfirmacao: 'token-de-teste',
};

describe('se o token não for informado', () => {
    test('ele dá um erro de token não informado', () => {
        return expect(() => confirmaConta(undefined)).rejects.toThrow('Token de confirmação não informado');
    });

    test('ele recusa um token que não é texto', () => {
        return expect(() => confirmaConta({ $ne: null })).rejects.toThrow('Token de confirmação não informado');
    });
});

describe('se o token não existir', () => {
    test('ele dá um erro de usuário não encontrado', () => {
        return expect(() => confirmaConta('token-que-nao-existe')).rejects.toThrow('Usuário não encontrado!');
    });
});

describe('se o token for válido', () => {
    test('ele confirma a conta do usuário', async () => {
        await Usuario.create(usuarioMock);

        await confirmaConta(usuarioMock.tokenDeConfirmacao);

        const usuario = await Usuario.findOne({ email: usuarioMock.email });
        expect(usuario.confirmado).toBe(true);
    });

    test('ele apaga o token para o link não poder ser usado de novo', async () => {
        await Usuario.create(usuarioMock);

        await confirmaConta(usuarioMock.tokenDeConfirmacao);

        const usuario = await Usuario.findOne({ email: usuarioMock.email }).select('+tokenDeConfirmacao');
        expect(usuario.tokenDeConfirmacao).toBeUndefined();

        await expect(() => confirmaConta(usuarioMock.tokenDeConfirmacao)).rejects.toThrow('Usuário não encontrado!');
    });
});
