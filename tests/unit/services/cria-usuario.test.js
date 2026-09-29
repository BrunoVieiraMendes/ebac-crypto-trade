const bcrypt = require('bcrypt');

const criaUsuario = require('../../../services/cria-usuario');
const { enviaEmailDeConfirmacao } = require('../../../services/envia-email');
const { Usuario } = require('../../../models');

// nao queremos mandar e-mail de verdade nos testes
jest.mock('../../../services/envia-email');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'teste@1234',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste'
};

describe('se uma senha não é informada', () => {
    test('ele dá um erro informando a ausência da senha', () => {
        const usuarioTest = { ...usuarioMock, senha: undefined };

        return expect(() => criaUsuario(usuarioTest, 'https://www.google.com.br')).rejects.toThrow('O campo senha e obrigatorio');
    });
});


describe('se a senha informada é fraca', () => {
    test('ele dá um erro informando o tamanho mínimo da senha', () => {
        const usuarioTest = { ...usuarioMock, senha: 123 };

        return expect(() => criaUsuario(usuarioTest, 'https://www.google.com.br')).rejects.toThrow('O campo senha deve ter no minimo 5 caracteres');
    });
});

describe('se a url de redirecionamento nao for passada', () => {
    test('ele dá um erro de url', () => {
        return expect(() => criaUsuario(usuarioMock, null)).rejects.toThrow('A URL de redirecionamento é obrigatoria');
    });

    test('ele não salva o usuário no banco', async () => {
        await expect(() => criaUsuario({ ...usuarioMock }, null)).rejects.toThrow();

        expect(await Usuario.countDocuments()).toBe(0);
    });
});

describe('se a url de redirecionamento for relativa', () => {
    test('ele dá um erro pedindo http:// ou https://', () => {
        return expect(() => criaUsuario({ ...usuarioMock }, '/bem-vindo')).rejects.toThrow('A URL de redirecionamento deve comecar com http:// ou https://');
    });
});

describe('se o CPF for inválido', () => {
    test('ele dá um erro de validação do CPF', () => {
        const usuarioTest = { ...usuarioMock, cpf: '123.456.789-00' };

        return expect(() => criaUsuario(usuarioTest, 'https://www.google.com.br')).rejects.toThrow('nao e um CPF valido');
    });
});

describe('se os dados estiverem corretos', () => {
    test('ele salva o usuário com a senha criptografada', async () => {
        await criaUsuario({ ...usuarioMock }, 'https://www.google.com.br');

        const usuario = await Usuario.findOne({ email: usuarioMock.email }).select('+senha');

        expect(usuario.senha).not.toBe(usuarioMock.senha);
        expect(await bcrypt.compare(usuarioMock.senha, usuario.senha)).toBe(true);
        expect(usuario.confirmado).toBe(false);
    });

    test('ele não devolve a senha nem o token de confirmação', async () => {
        const usuario = await criaUsuario({ ...usuarioMock }, 'https://www.google.com.br');

        expect(usuario.senha).toBeUndefined();
        expect(usuario.tokenDeConfirmacao).toBeUndefined();
        expect(usuario.email).toBe(usuarioMock.email);
    });

    test('ele envia o e-mail de confirmação com o token', async () => {
        await criaUsuario({ ...usuarioMock }, 'https://www.google.com.br');

        expect(enviaEmailDeConfirmacao).toHaveBeenCalledTimes(1);

        const [usuarioDoEmail, url] = enviaEmailDeConfirmacao.mock.calls[0];
        expect(usuarioDoEmail.tokenDeConfirmacao).toMatch(/^[0-9a-f]{64}$/);
        expect(url).toBe('https://www.google.com.br');
    });
});
