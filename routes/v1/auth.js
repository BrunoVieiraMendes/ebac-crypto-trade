const express = require('express');
const { logger, ehUrlDeRedirecionamentoValida } = require('../../utils');
const { logaUsuario, confirmaConta, enviaEmailDeRecuperacao, validaTokenAlteracaoDeSenha } = require('../../services');

const router = express.Router();

/**
 * @openapi
 * /v1/auth:
 *   post:
 *     summary: Login
 *     description: Rota que autentica o usuário e retorna um JWT. O usuário precisa ter confirmado a conta pelo e-mail.
 *     requestBody:
 *       description: Suas informações de login
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Request realizado com sucesso e JWT obtido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Email ou senha inválidos, ou conta ainda não confirmada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               credenciaisInvalidas:
 *                 summary: Email ou senha inválidos
 *                 value:
 *                   sucesso: false
 *                   erro: Email ou senha invalidos
 *               contaNaoConfirmada:
 *                 summary: Conta ainda não confirmada
 *                 value:
 *                   sucesso: false
 *                   erro: Usuario nao confirmado! Cheque seu email para logar
 *     tags:
 *       - autenticação
 */


router.post('/', async(req, res) => {
    try {
        const { email, senha } = req.body;

        const jwt = await logaUsuario(email, senha);

        res.status(200).json({
            sucesso: true,
            jwt: jwt,
        });
    } catch (e) {
        logger.error(`Erro na autenticacao: ${e.message}`);

        if (e.message.match('confirmado')) {
            res.status(401).json({
            sucesso: false,
            erro: e.message
            });


        } else {
            res.status(401).json({
            sucesso: false,
            erro: 'Email ou senha invalidos'
            });
        }
            
        
    }
});

/**
 * @openapi
 * /v1/auth/confirma-conta:
 *   get:
 *     summary: Confirma a conta do usuário
 *     description: Link enviado por e-mail após o cadastro. Confirma a conta a partir do token e redireciona o usuário para a URL informada no cadastro.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de confirmação enviado por e-mail
 *         example: 9f1c2e7a4b8d0e6f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f
 *       - in: query
 *         name: redirect
 *         required: false
 *         schema:
 *           type: string
 *           format: uri
 *         description: URL de redirecionamento após a confirmação (padrão https://www.google.com.br)
 *         example: https://www.meusite.com.br/bem-vindo
 *     responses:
 *       302:
 *         description: Conta confirmada. O usuário é redirecionado para a URL informada
 *         headers:
 *           Location:
 *             description: URL de redirecionamento
 *             schema:
 *               type: string
 *       422:
 *         description: Token não informado ou inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               tokenNaoInformado:
 *                 summary: Token não informado
 *                 value:
 *                   sucesso: false
 *                   erro: Token de confirmação não informado
 *               usuarioNaoEncontrado:
 *                 summary: Token inválido ou já utilizado
 *                 value:
 *                   sucesso: false
 *                   erro: Usuário não encontrado!
 *     tags:
 *       - autenticação
 */

router.get('/confirma-conta', async (req, res) => {
    try {
        const { token, redirect } = req.query;

        await confirmaConta(token);

        // se o redirect nao for uma URL absoluta valida, usa um fallback seguro
        const urlFinal = ehUrlDeRedirecionamentoValida(redirect)
            ? redirect
            : 'https://www.google.com.br';

        return res.redirect(urlFinal);
    } catch (e) {
        logger.error(`Erro na confirmação de conta: ${e.message}`);

        return res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});


/**
 * @openapi
 * /v1/auth/pede-recuperacao:
 *   get:
 *     summary: Pede a recuperação de senha
 *     description: >
 *       Gera um token de recuperação e envia por e-mail um link válido por 5 minutos.
 *       A resposta é sempre a mesma, exista ou não um cadastro com aquele e-mail,
 *       para não revelar quem tem conta na corretora. Cada novo pedido invalida o link anterior.
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: E-mail cadastrado que receberá o link de recuperação
 *         example: bruno@email.com
 *       - in: query
 *         name: redirect
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: URL da sua tela de troca de senha, para onde o usuário será levado após clicar no link
 *         example: https://www.meusite.com.br/nova-senha
 *     responses:
 *       200:
 *         description: Pedido recebido (a mensagem é a mesma mesmo se o e-mail não existir)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensagemResponse'
 *             example:
 *               sucesso: true
 *               mensagem: Se você possui um cadastro você receberá o email
 *       422:
 *         description: Parâmetros obrigatórios não informados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               emailFaltando:
 *                 summary: E-mail não informado
 *                 value:
 *                   sucesso: false
 *                   erro: Deve ser enviado um parâmetro com o email que deseja pedir a recuperação
 *               redirectFaltando:
 *                 summary: Redirect não informado
 *                 value:
 *                   sucesso: false
 *                   erro: Deve ser enviado um parâmetro com a URL de redirecionamento
 *               redirectRelativo:
 *                 summary: Redirect sem http:// ou https://
 *                 value:
 *                   sucesso: false
 *                   erro: 'A URL de redirecionamento deve comecar com http:// ou https://'
 *     tags:
 *       - autenticação
 */

router.get('/pede-recuperacao', async (req, res) => {
    try {
        const { email, redirect } = req.query;

        await enviaEmailDeRecuperacao(email, redirect);

        res.status(200).json({
            sucesso: true,
            mensagem: 'Se você possui um cadastro você receberá o email',
        });
    } catch (e) {
        logger.error(`Erro no envio da recuperação de senha: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message
        });
    }
});


/**
 * @openapi
 * /v1/auth/valida-token:
 *   get:
 *     summary: Valida o token de recuperação de senha
 *     description: >
 *       Link enviado no e-mail de recuperação. Valida o token e redireciona para a URL
 *       informada no pedido, acrescentando um JWT de 15 minutos na query string
 *       (`?jwt=...`). Esse JWT deve ser usado em PUT /v1/usuarios/senha para gravar a nova senha.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token recebido por e-mail (JWT válido por 5 minutos)
 *         example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6ImZlYzBmMDkifQ.abc123
 *       - in: query
 *         name: redirect
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: URL da tela de troca de senha, que receberá o JWT na query string
 *         example: https://www.meusite.com.br/nova-senha
 *     responses:
 *       302:
 *         description: Token válido. Redireciona para `redirect?jwt=<token>`
 *         headers:
 *           Location:
 *             description: URL de redirecionamento já com o JWT
 *             schema:
 *               type: string
 *               example: https://www.meusite.com.br/nova-senha?jwt=eyJhbGciOiJIUzI1NiJ9...
 *       422:
 *         description: Token inválido, já utilizado ou expirado, ou redirect inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               tokenInvalido:
 *                 summary: Token inválido ou expirado
 *                 value:
 *                   sucesso: false
 *                   erro: Token não encontrado ou expirado. Requisite um novo!
 *               redirectRelativo:
 *                 summary: Redirect sem http:// ou https://
 *                 value:
 *                   sucesso: false
 *                   erro: 'A URL de redirecionamento deve comecar com http:// ou https://'
 *     tags:
 *       - autenticação
 */

router.get('/valida-token', async (req, res) => {
    try {
        const { token, redirect } = req.query;

        if (!ehUrlDeRedirecionamentoValida(redirect)) {
            throw new Error('A URL de redirecionamento deve comecar com http:// ou https://');
        }

        const jwt = await validaTokenAlteracaoDeSenha(token);

        const separador = redirect.includes('?') ? '&' : '?';
        res.redirect(`${redirect}${separador}jwt=${jwt}`);
    } catch (e) {
        logger.error(`Erro na validação do token de recuperação de senha: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});



module.exports = router;