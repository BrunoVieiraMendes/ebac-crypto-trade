const express = require('express');
const { logger } = require('../../utils');
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

        // Se 'redirect' for nulo, vazio ou a string literal "undefined", usa um fallback seguro
        const urlFinal = (redirect && redirect !== 'undefined' && redirect !== '') 
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


router.get('/valida-token', async (req, res) => {
    try {
        const { token, redirect } = req.query;

        const jwt = await validaTokenAlteracaoDeSenha(token);

        res.redirect(`${redirect}?jwt=${jwt}`);
    } catch (e) {
        logger.error(`Erro na validação do token de recuperação de senha: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});



module.exports = router;