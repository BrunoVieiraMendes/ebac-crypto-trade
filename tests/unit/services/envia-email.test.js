const jsonWebToken = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// o transporter e criado quando o modulo carrega, entao o mock precisa vir antes
jest.mock('nodemailer', () => {
    const sendMail = jest.fn().mockResolvedValue({});
    return { createTransport: jest.fn(() => ({ sendMail })) };
});

const {
    enviaEmailDeConfirmacao,
    enviaEmailDeRecuperacao,
    enviaEmailDeParabenizacao,
} = require('../../../services/envia-email');
const { Usuario } = require('../../../models');

process.env.JWT_SECRET_KEY = 'segredo-de-teste';
process.env.URL_DA_CRYPTOTRADE = 'http://localhost:3000';

const sendMail = nodemailer.createTransport().sendMail;

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    confirmado: true,
};

const emailEnviado = () => sendMail.mock.calls[0][0];

describe('e-mail de confirmação', () => {
    describe('se a url de redirecionamento for inválida', () => {
        test('ele dá um erro e não envia o e-mail', async () => {
            await expect(() => enviaEmailDeConfirmacao({ ...usuarioMock, tokenDeConfirmacao: 'abc' }, 'javascript:alert(1)'))
                .rejects.toThrow('A URL de redirecionamento deve comecar com http:// ou https://');

            expect(sendMail).not.toHaveBeenCalled();
        });
    });

    describe('se os dados estiverem corretos', () => {
        test('ele envia o e-mail para o usuário com o link de confirmação', async () => {
            await enviaEmailDeConfirmacao({ ...usuarioMock, tokenDeConfirmacao: 'abc123' }, 'https://www.meusite.com.br/bem-vindo?x=1');

            const email = emailEnviado();
            const link = 'http://localhost:3000/v1/auth/confirma-conta?token=abc123&redirect=https%3A%2F%2Fwww.meusite.com.br%2Fbem-vindo%3Fx%3D1';

            expect(email.to).toBe(usuarioMock.email);
            expect(email.subject).toBe('Confirme a sua conta!');
            expect(email.text).toContain(link);
            expect(email.html).toContain(usuarioMock.nome);
        });
    });
});

describe('e-mail de recuperação de senha', () => {
    describe('se faltar algum parâmetro', () => {
        test('ele dá um erro se a url não for informada', () => {
            return expect(() => enviaEmailDeRecuperacao(usuarioMock.email, undefined))
                .rejects.toThrow('Deve ser enviado um parâmetro com a URL de redirecionamento');
        });

        test('ele dá um erro se a url for relativa', () => {
            return expect(() => enviaEmailDeRecuperacao(usuarioMock.email, '/nova-senha'))
                .rejects.toThrow('A URL de redirecionamento deve comecar com http:// ou https://');
        });

        test('ele dá um erro se o email não for informado', () => {
            return expect(() => enviaEmailDeRecuperacao(undefined, 'https://www.meusite.com.br/nova-senha'))
                .rejects.toThrow('Deve ser enviado um parâmetro com o email que deseja pedir a recuperação');
        });
    });

    describe('se o email não estiver cadastrado', () => {
        test('ele não dá erro e não envia nada, para não revelar quem tem conta', async () => {
            await expect(enviaEmailDeRecuperacao('naoexiste@ebac.com.br', 'https://www.meusite.com.br/nova-senha')).resolves.toBeUndefined();

            expect(sendMail).not.toHaveBeenCalled();
        });
    });

    describe('se o email estiver cadastrado', () => {
        test('ele grava um token de recuperação e envia o link com ele', async () => {
            await Usuario.create(usuarioMock);

            await enviaEmailDeRecuperacao(usuarioMock.email, 'https://www.meusite.com.br/nova-senha');

            const usuario = await Usuario.findOne({ email: usuarioMock.email }).select('+tokenDeRecuperacao');
            expect(usuario.tokenDeRecuperacao).toMatch(/^[0-9a-f]{64}$/);

            const email = emailEnviado();
            expect(email.to).toBe(usuarioMock.email);
            expect(email.subject).toBe('Pedido de recuperação de senha!');

            // o link leva um JWT de 5 minutos com o token gravado no usuario
            const jwt = decodeURIComponent(email.text.match(/valida-token\?token=([^&\s]+)/)[1]);
            const payload = jsonWebToken.verify(jwt, process.env.JWT_SECRET_KEY);
            expect(payload.token).toBe(usuario.tokenDeRecuperacao);
            expect(payload.exp - payload.iat).toBe(5 * 60);
        });

        test('ele troca o token a cada novo pedido, invalidando o link anterior', async () => {
            await Usuario.create(usuarioMock);

            await enviaEmailDeRecuperacao(usuarioMock.email, 'https://www.meusite.com.br/nova-senha');
            const primeiro = (await Usuario.findOne({ email: usuarioMock.email }).select('+tokenDeRecuperacao')).tokenDeRecuperacao;

            await enviaEmailDeRecuperacao(usuarioMock.email, 'https://www.meusite.com.br/nova-senha');
            const segundo = (await Usuario.findOne({ email: usuarioMock.email }).select('+tokenDeRecuperacao')).tokenDeRecuperacao;

            expect(segundo).not.toBe(primeiro);
        });
    });
});

describe('e-mail de parabenização', () => {
    test('ele envia o lucro formatado em reais', async () => {
        await enviaEmailDeParabenizacao(usuarioMock, 1500.5);

        const email = emailEnviado();
        expect(email.to).toBe(usuarioMock.email);
        expect(email.subject).toBe('Parabens pelos seus trades de ontem!');
        // o toLocaleString usa um espaco nao separavel entre o R$ e o valor
        expect(email.text).toMatch(/R\$\s1\.500,50/);
        expect(email.text).toContain('http://localhost:3000/v1/cotacoes');
    });
});
