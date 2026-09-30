const request = require('supertest');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { generateSecret, generateSync } = require('otplib');

// nao queremos mandar e-mail de verdade nos testes
jest.mock('nodemailer', () => {
    const sendMail = jest.fn().mockResolvedValue({});
    return { createTransport: jest.fn(() => ({ sendMail })) };
});

const app = require('../../../app');
const { Usuario } = require('../../../models');
const { checaAutenticacao } = require('./shared/autenticacao');
const { criaUsuario, criaUsuarioLogado, criaUsuarioCom2fa } = require('./shared/usuario');

const sendMail = nodemailer.createTransport().sendMail;

const novoUsuario = {
    nome: 'Usuário de teste',
    email: 'novo@ebac.com.br',
    cpf: '301.372.350-54',
    senha: 'senha@1234',
};

const segredoNoBanco = async (usuario) => (await Usuario.findById(usuario._id).select('+segredoOtp')).segredoOtp;

// o QR Code e um SVG; o supertest pode entregar como texto ou como Buffer
const conteudo = (resposta) => resposta.text || resposta.body.toString();

describe('POST /v1/usuarios', () => {
    const cadastra = (corpo) => request(app).post('/v1/usuarios').send(corpo);

    describe('se os dados estiverem corretos', () => {
        test('ele retorna um 200 com o usuário, sem a senha e sem o token', () => {
            return cadastra({ usuario: novoUsuario, redirect: 'https://www.meusite.com.br' })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(true);
                    expect(resposta.body.usuario.email).toBe(novoUsuario.email);
                    expect(resposta.body.usuario.confirmado).toBe(false);
                    expect(resposta.body.usuario).not.toHaveProperty('senha');
                    expect(resposta.body.usuario).not.toHaveProperty('tokenDeConfirmacao');
                });
        });

        test('ele salva o usuário com a senha criptografada', async () => {
            await cadastra({ usuario: novoUsuario, redirect: 'https://www.meusite.com.br' });

            const usuario = await Usuario.findOne({ email: novoUsuario.email }).select('+senha');
            expect(await bcrypt.compare(novoUsuario.senha, usuario.senha)).toBe(true);
        });

        test('ele envia o e-mail de confirmação para o usuário', async () => {
            await cadastra({ usuario: novoUsuario, redirect: 'https://www.meusite.com.br' });

            expect(sendMail).toHaveBeenCalledTimes(1);
            expect(sendMail.mock.calls[0][0].to).toBe(novoUsuario.email);
            expect(sendMail.mock.calls[0][0].text).toMatch(/\/v1\/auth\/confirma-conta\?token=[0-9a-f]{64}/);
        });
    });

    describe('se o redirect não for enviado', () => {
        test('ele retorna um 422 e não cria o usuário', async () => {
            await cadastra({ usuario: novoUsuario })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Deve passar um parametro redirect para onde o usuario sera redireciondo pos confirmacao');
                });

            expect(await Usuario.countDocuments()).toBe(0);
        });
    });

    describe('se o redirect for relativo', () => {
        test('ele retorna um 422 e não cria o usuário', async () => {
            await cadastra({ usuario: novoUsuario, redirect: '/bem-vindo' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('A URL de redirecionamento deve comecar com http:// ou https://');
                });

            expect(await Usuario.countDocuments()).toBe(0);
        });
    });

    describe('se os dados do usuário forem inválidos', () => {
        test.each([
            ['sem senha', { senha: undefined }, 'O campo senha e obrigatorio'],
            ['com senha curta', { senha: '1234' }, 'O campo senha deve ter no minimo 5 caracteres'],
            ['com CPF inválido', { cpf: '123.456.789-00' }, 'nao e um CPF valido'],
            ['com e-mail sem @', { email: 'novo.ebac.com.br' }, 'nao e um e-mail valido'],
        ])('ele retorna um 422 %s', (_descricao, dados, erro) => {
            return cadastra({ usuario: { ...novoUsuario, ...dados }, redirect: 'https://www.meusite.com.br' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.sucesso).toBe(false);
                    expect(resposta.body.erro).toMatch(erro);
                });
        });
    });

    describe('se o e-mail ou o CPF já estiverem cadastrados', () => {
        beforeEach(async () => {
            await Usuario.init();
            await criaUsuario({ email: novoUsuario.email, cpf: novoUsuario.cpf });
        });

        test('ele retorna um 422 com o e-mail repetido', () => {
            return cadastra({ usuario: { ...novoUsuario, cpf: '529.982.247-25' }, redirect: 'https://www.meusite.com.br' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toMatch('duplicate key');
                });
        });

        test('ele retorna um 422 com o CPF repetido', () => {
            return cadastra({ usuario: { ...novoUsuario, email: 'outro@ebac.com.br' }, redirect: 'https://www.meusite.com.br' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toMatch('duplicate key');
                });
        });
    });
});

describe('PUT /v1/usuarios/senha', () => {
    checaAutenticacao('/v1/usuarios/senha', 'put');

    describe('se a nova senha for válida', () => {
        test('ele retorna um 200 e o login passa a funcionar com a nova senha', async () => {
            const { usuario, jwt } = await criaUsuarioLogado();

            await request(app)
                .put('/v1/usuarios/senha')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ senha: 'nova-senha-123' })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, mensagem: 'Senha alterada com sucesso' });
                });

            await request(app)
                .post('/v1/auth')
                .send({ email: usuario.email, senha: 'nova-senha-123' })
                .expect(200);
        });

        test('ele invalida o token de recuperação de senha', async () => {
            const { usuario, jwt } = await criaUsuarioLogado({ tokenDeRecuperacao: 'token-de-recuperacao' });

            await request(app)
                .put('/v1/usuarios/senha')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ senha: 'nova-senha-123' });

            expect((await Usuario.findById(usuario._id).select('+tokenDeRecuperacao')).tokenDeRecuperacao).toBeUndefined();
        });
    });

    describe('se a nova senha for inválida', () => {
        test.each([
            ['não informada', {}, 'O campo senha e obrigatorio'],
            ['curta', { senha: '1234' }, 'O campo senha deve ter no minimo 5 caracteres'],
        ])('ele retorna um 422 com a senha %s', async (_descricao, corpo, erro) => {
            const { jwt } = await criaUsuarioLogado();

            return request(app)
                .put('/v1/usuarios/senha')
                .set('Authorization', `Bearer ${jwt}`)
                .send(corpo)
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro });
                });
        });
    });
});

describe('POST /v1/usuarios/otp', () => {
    checaAutenticacao('/v1/usuarios/otp', 'post');

    describe('se o usuário ainda não tem o 2FA ativo', () => {
        test('ele retorna um 200 com o QR Code em SVG', async () => {
            const { jwt } = await criaUsuarioLogado();

            return request(app)
                .post('/v1/usuarios/otp')
                .set('Authorization', `Bearer ${jwt}`)
                .expect(200)
                .expect('Content-Type', /image\/svg\+xml/)
                .then(resposta => {
                    expect(conteudo(resposta)).toContain('<svg');
                });
        });

        test('ele guarda o segredo, mas ainda não ativa o 2FA', async () => {
            const { usuario, jwt } = await criaUsuarioLogado();

            await request(app).post('/v1/usuarios/otp').set('Authorization', `Bearer ${jwt}`);

            expect(await segredoNoBanco(usuario)).toEqual(expect.any(String));
            expect((await Usuario.findById(usuario._id)).otpAtivo).toBe(false);
        });

        test('ele troca o segredo se o QR Code for gerado de novo', async () => {
            const { usuario, jwt } = await criaUsuarioLogado();

            await request(app).post('/v1/usuarios/otp').set('Authorization', `Bearer ${jwt}`);
            const primeiro = await segredoNoBanco(usuario);
            await request(app).post('/v1/usuarios/otp').set('Authorization', `Bearer ${jwt}`);

            expect(await segredoNoBanco(usuario)).not.toBe(primeiro);
        });
    });

    describe('se o usuário já tem o 2FA ativo', () => {
        test('ele retorna um 422 e mantém o segredo atual', async () => {
            const { usuario, jwt, segredo } = await criaUsuarioCom2fa();

            await request(app)
                .post('/v1/usuarios/otp')
                .set('Authorization', `Bearer ${jwt}`)
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('O 2FA ja esta ativo. Desative antes de gerar um novo QR Code');
                });

            expect(await segredoNoBanco(usuario)).toBe(segredo);
        });
    });
});

describe('POST /v1/usuarios/otp/valida', () => {
    checaAutenticacao('/v1/usuarios/otp/valida', 'post');

    describe('se o QR Code ainda não foi gerado', () => {
        test('ele retorna um 422', async () => {
            const { jwt } = await criaUsuarioLogado();

            return request(app)
                .post('/v1/usuarios/otp/valida')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ token: '123456' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Gere o QR Code em POST /v1/usuarios/otp antes de ativar o 2FA');
                });
        });
    });

    describe('se o QR Code foi gerado', () => {
        let usuario, jwt, segredo;

        beforeEach(async () => {
            ({ usuario, jwt } = await criaUsuarioLogado());
            await request(app).post('/v1/usuarios/otp').set('Authorization', `Bearer ${jwt}`);
            segredo = await segredoNoBanco(usuario);
        });

        test('ele ativa o 2FA com o código certo', async () => {
            await request(app)
                .post('/v1/usuarios/otp/valida')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ token: generateSync({ secret: segredo }) })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, mensagem: '2FA ativado com sucesso' });
                });

            expect((await Usuario.findById(usuario._id)).otpAtivo).toBe(true);
        });

        test('ele retorna um 422 com o código errado e não ativa', async () => {
            await request(app)
                .post('/v1/usuarios/otp/valida')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ token: generateSync({ secret: generateSecret() }) })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Codigo OTP invalido');
                });

            expect((await Usuario.findById(usuario._id)).otpAtivo).toBe(false);
        });
    });
});

describe('DELETE /v1/usuarios/otp', () => {
    checaAutenticacao('/v1/usuarios/otp', 'delete');

    describe('se o 2FA não estiver ativo', () => {
        test('ele retorna um 422', async () => {
            const { jwt } = await criaUsuarioLogado();

            return request(app)
                .delete('/v1/usuarios/otp')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ token: '123456' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('O 2FA nao esta ativo nessa conta');
                });
        });
    });

    describe('se o 2FA estiver ativo', () => {
        test('ele desativa e apaga o segredo com o código certo', async () => {
            const { usuario, jwt, geraOtp } = await criaUsuarioCom2fa();

            await request(app)
                .delete('/v1/usuarios/otp')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ token: geraOtp() })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, mensagem: '2FA desativado com sucesso' });
                });

            expect((await Usuario.findById(usuario._id)).otpAtivo).toBe(false);
            expect(await segredoNoBanco(usuario)).toBeUndefined();
        });

        test('ele retorna um 422 com o código errado e mantém o 2FA', async () => {
            const { usuario, jwt } = await criaUsuarioCom2fa();

            await request(app)
                .delete('/v1/usuarios/otp')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ token: generateSync({ secret: generateSecret() }) })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Codigo OTP invalido');
                });

            expect((await Usuario.findById(usuario._id)).otpAtivo).toBe(true);
        });
    });
});
