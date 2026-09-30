const request = require('supertest');
const jsonwebtoken = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { generateSecret, generateSync } = require('otplib');

// nao queremos mandar e-mail de verdade nos testes
jest.mock('nodemailer', () => {
    const sendMail = jest.fn().mockResolvedValue({});
    return { createTransport: jest.fn(() => ({ sendMail })) };
});

const app = require('../../../app');
const { Usuario } = require('../../../models');
const { SENHA, criaUsuario, criaUsuarioCom2fa } = require('./shared/usuario');

const sendMail = nodemailer.createTransport().sendMail;

// pega o valor de um parametro do link que foi enviado no e-mail
const parametroDoEmail = (nome) => {
    const link = sendMail.mock.calls[0][0].text.match(/https?:\/\/\S+/)[0];
    return new URL(link).searchParams.get(nome);
};

describe('POST /v1/auth', () => {
    const loga = (corpo) => request(app).post('/v1/auth').send(corpo);

    describe('se o email e a senha estiverem certos', () => {
        test('ele retorna um 200 com um JWT do usuário', async () => {
            const usuario = await criaUsuario();

            return loga({ email: usuario.email, senha: SENHA })
                .expect(200)
                .then(resposta => {
                    const payload = jsonwebtoken.verify(resposta.body.jwt, process.env.JWT_SECRET_KEY);

                    expect(resposta.body.sucesso).toBe(true);
                    expect(payload.id).toBe(usuario._id.toString());
                });
        });

        test('o JWT devolvido dá acesso às rotas autenticadas', async () => {
            const usuario = await criaUsuario();
            const { body } = await loga({ email: usuario.email, senha: SENHA });

            return request(app)
                .get('/v1/usuarios/me')
                .set('Authorization', `Bearer ${body.jwt}`)
                .expect(200);
        });
    });

    describe('se o email ou a senha estiverem errados', () => {
        test('ele retorna um 401 com a senha errada', async () => {
            const usuario = await criaUsuario();

            return loga({ email: usuario.email, senha: 'senha-errada' })
                .expect(401)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: 'Email ou senha invalidos' });
                });
        });

        test('ele retorna a mesma mensagem para email inexistente, sem revelar quem tem conta', () => {
            return loga({ email: 'naoexiste@ebac.com.br', senha: SENHA })
                .expect(401)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: 'Email ou senha invalidos' });
                });
        });

        test('ele retorna um 401 sem email ou sem senha', async () => {
            await loga({ senha: SENHA }).expect(401);
            await loga({ email: 'alguem@ebac.com.br' }).expect(401);
        });
    });

    describe('se o usuário não confirmou a conta', () => {
        test('ele retorna um 401 pedindo a confirmação', async () => {
            const usuario = await criaUsuario({ confirmado: false });

            return loga({ email: usuario.email, senha: SENHA })
                .expect(401)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Usuario nao confirmado! Cheque seu email para logar');
                });
        });
    });

    describe('se o usuário tem o 2FA ativo', () => {
        test('ele retorna um 401 sem o código OTP', async () => {
            const { usuario } = await criaUsuarioCom2fa();

            return loga({ email: usuario.email, senha: SENHA })
                .expect(401)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Informe o codigo OTP do seu aplicativo autenticador');
                });
        });

        test('ele retorna um 401 com o código OTP errado', async () => {
            const { usuario } = await criaUsuarioCom2fa();

            return loga({ email: usuario.email, senha: SENHA, otp: generateSync({ secret: generateSecret() }) })
                .expect(401)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Codigo OTP invalido');
                });
        });

        test('ele retorna um 200 com o código OTP certo', async () => {
            const { usuario, geraOtp } = await criaUsuarioCom2fa();

            return loga({ email: usuario.email, senha: SENHA, otp: geraOtp() })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body.jwt).toEqual(expect.any(String));
                });
        });
    });
});

describe('GET /v1/auth/confirma-conta', () => {
    const cadastraERecebeToken = async () => {
        await request(app)
            .post('/v1/usuarios')
            .send({
                usuario: { nome: 'Novo', email: 'novo@ebac.com.br', cpf: '301.372.350-54', senha: SENHA },
                redirect: 'https://www.meusite.com.br/bem-vindo',
            });

        return parametroDoEmail('token');
    };

    describe('se o token do e-mail for válido', () => {
        test('ele confirma a conta e redireciona para o site informado', async () => {
            const token = await cadastraERecebeToken();

            await request(app)
                .get('/v1/auth/confirma-conta')
                .query({ token, redirect: 'https://www.meusite.com.br/bem-vindo' })
                .expect(302)
                .expect('Location', 'https://www.meusite.com.br/bem-vindo');

            expect((await Usuario.findOne({ email: 'novo@ebac.com.br' })).confirmado).toBe(true);
        });

        test('depois de confirmar, o usuário consegue logar', async () => {
            const token = await cadastraERecebeToken();

            await request(app).get('/v1/auth/confirma-conta').query({ token, redirect: 'https://www.meusite.com.br' });

            return request(app)
                .post('/v1/auth')
                .send({ email: 'novo@ebac.com.br', senha: SENHA })
                .expect(200);
        });

        test('ele usa o Google como redirect se a URL for inválida', async () => {
            const token = await cadastraERecebeToken();

            return request(app)
                .get('/v1/auth/confirma-conta')
                .query({ token, redirect: '/relativo' })
                .expect(302)
                .expect('Location', 'https://www.google.com.br');
        });

        test('o link não funciona uma segunda vez', async () => {
            const token = await cadastraERecebeToken();

            await request(app).get('/v1/auth/confirma-conta').query({ token, redirect: 'https://www.meusite.com.br' });

            return request(app)
                .get('/v1/auth/confirma-conta')
                .query({ token, redirect: 'https://www.meusite.com.br' })
                .expect(422);
        });
    });

    describe('se o token for inválido', () => {
        test('ele retorna um 422 com token inexistente', () => {
            return request(app)
                .get('/v1/auth/confirma-conta')
                .query({ token: 'token-que-nao-existe' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: 'Usuário não encontrado!' });
                });
        });

        test('ele retorna um 422 sem token', () => {
            return request(app)
                .get('/v1/auth/confirma-conta')
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('Token de confirmação não informado');
                });
        });
    });
});

describe('GET /v1/auth/pede-recuperacao', () => {
    const MENSAGEM = 'Se você possui um cadastro você receberá o email';

    describe('se o e-mail estiver cadastrado', () => {
        test('ele retorna um 200 e envia o e-mail de recuperação', async () => {
            const usuario = await criaUsuario();

            await request(app)
                .get('/v1/auth/pede-recuperacao')
                .query({ email: usuario.email, redirect: 'https://www.meusite.com.br/nova-senha' })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, mensagem: MENSAGEM });
                });

            expect(sendMail).toHaveBeenCalledTimes(1);
            expect(sendMail.mock.calls[0][0].to).toBe(usuario.email);
        });
    });

    describe('se o e-mail não estiver cadastrado', () => {
        test('ele retorna a mesma resposta, mas não envia e-mail', async () => {
            await request(app)
                .get('/v1/auth/pede-recuperacao')
                .query({ email: 'naoexiste@ebac.com.br', redirect: 'https://www.meusite.com.br/nova-senha' })
                .expect(200)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: true, mensagem: MENSAGEM });
                });

            expect(sendMail).not.toHaveBeenCalled();
        });
    });

    describe('se faltar algum parâmetro', () => {
        test.each([
            ['sem e-mail', { redirect: 'https://www.meusite.com.br' }, 'Deve ser enviado um parâmetro com o email que deseja pedir a recuperação'],
            ['sem redirect', { email: 'alguem@ebac.com.br' }, 'Deve ser enviado um parâmetro com a URL de redirecionamento'],
            ['com redirect relativo', { email: 'alguem@ebac.com.br', redirect: '/nova-senha' }, 'A URL de redirecionamento deve comecar com http:// ou https://'],
        ])('ele retorna um 422 %s', (_descricao, query, erro) => {
            return request(app)
                .get('/v1/auth/pede-recuperacao')
                .query(query)
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro });
                });
        });
    });
});

describe('GET /v1/auth/valida-token', () => {
    let usuario;

    const pedeRecuperacao = async () => {
        usuario = await criaUsuario();

        await request(app)
            .get('/v1/auth/pede-recuperacao')
            .query({ email: usuario.email, redirect: 'https://www.meusite.com.br/nova-senha' });

        return parametroDoEmail('token');
    };

    describe('se o token do e-mail for válido', () => {
        test('ele redireciona para o site com um JWT na query string', async () => {
            const token = await pedeRecuperacao();

            return request(app)
                .get('/v1/auth/valida-token')
                .query({ token, redirect: 'https://www.meusite.com.br/nova-senha' })
                .expect(302)
                .then(resposta => {
                    const destino = new URL(resposta.headers.location);
                    const payload = jsonwebtoken.verify(destino.searchParams.get('jwt'), process.env.JWT_SECRET_KEY);

                    expect(destino.origin + destino.pathname).toBe('https://www.meusite.com.br/nova-senha');
                    expect(payload.id).toBe(usuario._id.toString());
                });
        });

        test('o fluxo completo troca a senha e invalida o link', async () => {
            const token = await pedeRecuperacao();

            const { headers } = await request(app)
                .get('/v1/auth/valida-token')
                .query({ token, redirect: 'https://www.meusite.com.br/nova-senha' });
            const jwt = new URL(headers.location).searchParams.get('jwt');

            await request(app)
                .put('/v1/usuarios/senha')
                .set('Authorization', `Bearer ${jwt}`)
                .send({ senha: 'senha-nova-123' })
                .expect(200);

            await request(app)
                .post('/v1/auth')
                .send({ email: usuario.email, senha: 'senha-nova-123' })
                .expect(200);

            // o link do e-mail nao pode ser usado de novo
            await request(app)
                .get('/v1/auth/valida-token')
                .query({ token, redirect: 'https://www.meusite.com.br/nova-senha' })
                .expect(422);
        });

        test('ele mantém os parâmetros que já existiam no redirect', async () => {
            const token = await pedeRecuperacao();

            return request(app)
                .get('/v1/auth/valida-token')
                .query({ token, redirect: 'https://www.meusite.com.br/nova-senha?origem=email' })
                .expect(302)
                .then(resposta => {
                    const destino = new URL(resposta.headers.location);

                    expect(destino.searchParams.get('origem')).toBe('email');
                    expect(destino.searchParams.get('jwt')).toEqual(expect.any(String));
                });
        });
    });

    describe('se o token ou o redirect forem inválidos', () => {
        test('ele retorna um 422 com um token falso', () => {
            return request(app)
                .get('/v1/auth/valida-token')
                .query({ token: 'nao-e-um-jwt', redirect: 'https://www.meusite.com.br/nova-senha' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body).toEqual({ sucesso: false, erro: 'Token não encontrado ou expirado. Requisite um novo!' });
                });
        });

        test('ele retorna um 422 com um redirect relativo', async () => {
            const token = await pedeRecuperacao();

            return request(app)
                .get('/v1/auth/valida-token')
                .query({ token, redirect: '/nova-senha' })
                .expect(422)
                .then(resposta => {
                    expect(resposta.body.erro).toBe('A URL de redirecionamento deve comecar com http:// ou https://');
                });
        });
    });
});
