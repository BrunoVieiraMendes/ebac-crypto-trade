const { Usuario } = require('../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
};

describe('se os campos obrigatórios não forem informados', () => {
    test('ele dá erro de validação em cada um', async () => {
        const erro = await Usuario.create({}).catch(e => e);

        expect(Object.keys(erro.errors)).toEqual(expect.arrayContaining(['nome', 'cpf', 'email', 'senha']));
    });
});

describe('se o CPF for inválido', () => {
    test('ele dá erro de validação', () => {
        return expect(Usuario.create({ ...usuarioMock, cpf: '111.111.111-11' })).rejects.toThrow('111.111.111-11 nao e um CPF valido');
    });
});

describe('se o email não tiver @', () => {
    test('ele dá erro de validação', () => {
        return expect(Usuario.create({ ...usuarioMock, email: 'test.ebac.com.br' })).rejects.toThrow('test.ebac.com.br nao e um e-mail valido');
    });
});

describe('se o CPF ou o email já estiverem cadastrados', () => {
    beforeEach(async () => {
        await Usuario.init(); // garante que os indices unique ja existem
        await Usuario.create(usuarioMock);
    });

    test('ele recusa o CPF repetido', () => {
        return expect(Usuario.create({ ...usuarioMock, email: 'outro@ebac.com.br' })).rejects.toThrow('duplicate key');
    });

    test('ele recusa o email repetido', () => {
        return expect(Usuario.create({ ...usuarioMock, cpf: '529.982.247-25' })).rejects.toThrow('duplicate key');
    });
});

describe('se o usuário for criado', () => {
    test('ele começa não confirmado e sem 2FA', async () => {
        const usuario = await Usuario.create(usuarioMock);

        expect(usuario.confirmado).toBe(false);
        expect(usuario.otpAtivo).toBe(false);
    });

    test('ele não devolve os campos sensíveis nas buscas', async () => {
        await Usuario.create({
            ...usuarioMock,
            tokenDeConfirmacao: 'token-confirmacao',
            tokenDeRecuperacao: 'token-recuperacao',
            segredoOtp: 'SEGREDO',
        });

        const usuario = (await Usuario.findOne({ email: usuarioMock.email })).toObject();

        expect(usuario.senha).toBeUndefined();
        expect(usuario.tokenDeConfirmacao).toBeUndefined();
        expect(usuario.tokenDeRecuperacao).toBeUndefined();
        expect(usuario.segredoOtp).toBeUndefined();
    });

    test('ele permite vários usuários sem 2FA (índice sparse do segredo)', async () => {
        await Usuario.init();
        await Usuario.create(usuarioMock);

        await expect(Usuario.create({ ...usuarioMock, email: 'outro@ebac.com.br', cpf: '529.982.247-25' })).resolves.toBeDefined();
    });
});

describe('se um depósito for menor que 100', () => {
    test('ele dá erro de validação', () => {
        const usuario = { ...usuarioMock, depositos: [{ valor: 99, data: new Date() }] };

        return expect(Usuario.create(usuario)).rejects.toThrow('is less than minimum allowed value (100)');
    });
});

describe('se um saque for menor que 1', () => {
    test('ele dá erro de validação', () => {
        const usuario = { ...usuarioMock, saques: [{ valor: 0, data: new Date() }] };

        return expect(Usuario.create(usuario)).rejects.toThrow('is less than minimum allowed value (1)');
    });
});
