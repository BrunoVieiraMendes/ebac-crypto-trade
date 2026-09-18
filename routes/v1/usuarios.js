const express = require('express');
const { criaUsuario, checaSaldo } = require('../../services');
const logger = require('../../utils/logger');
const passport = require('passport');
const bcrypt = require('bcrypt');


const router = express.Router();

/**
 * @openapi
 * /v1/usuarios:
 *   post:
 *     summary: Cadastra um novo usuário
 *     description: Cria o usuário e envia um e-mail com o link de confirmação da conta. O login só é permitido após a confirmação.
 *     requestBody:
 *       description: Dados do usuário e URL de redirecionamento pós confirmação
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CriaUsuarioRequest'
 *     responses:
 *       200:
 *         description: Usuário criado com sucesso e e-mail de confirmação enviado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CriaUsuarioResponse'
 *       422:
 *         description: Dados inválidos ou faltando
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               redirectFaltando:
 *                 summary: Parâmetro redirect não informado
 *                 value:
 *                   sucesso: false
 *                   erro: Deve passar um parametro redirect para onde o usuario sera redireciondo pos confirmacao
 *               senhaFaltando:
 *                 summary: Senha não informada
 *                 value:
 *                   sucesso: false
 *                   erro: O campo senha e obrigatorio
 *               senhaCurta:
 *                 summary: Senha com menos de 5 caracteres
 *                 value:
 *                   sucesso: false
 *                   erro: O campo senha de ter no minimo 5 caracteres
 *               cpfInvalido:
 *                 summary: CPF inválido
 *                 value:
 *                   sucesso: false
 *                   erro: 'Usuario validation failed: cpf: 123.456.789-00 nao e um CPF valido '
 *     tags:
 *       - usuário
 */

router.post('/', async(req, res) => {
    const dados = req.body.usuario;
    const urlDeRedirecionamento = req.body.redirect;

    if (!urlDeRedirecionamento) {
        return res.status(422).json({
            sucesso: false,
            erro: 'Deve passar um parametro redirect para onde o usuario sera redireciondo pos confirmacao'
        });
    }

    try {
        const usuario = await criaUsuario(dados, urlDeRedirecionamento);

        res.json({
            sucesso: true,
            usuario: usuario,
        });
    } catch (e) {
        logger.error(`Erro na criacao do usuario ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});


router.put('/senha',
    passport.authenticate('jwt', { session: false}),
    async(req, res) => {
    const { senha } = req.body;

    try {
        const usuario = req.user;
        usuario.senha = await bcrypt.hash(senha, 10);
        await usuario.save();

        res.json({
            sucesso: true,
            mensagem: 'Senha alterada com sucesso';
        });
    } catch (e) {
        res.status(422).json({
            sucesso: false,
            erro: e.message,
        })
    }



/**
 * @openapi
 * /v1/usuarios/me:
 *   get:
 *     summary: Perfil do usuário
 *     description: Rota que retorna o perfil do usuário autenticado e o saldo total em BRL. A senha e o token de confirmação nunca são retornados
 *     security:
 *       - auth: []
 *     responses:
 *       200:
 *         description: Informações do perfil do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerfilResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *     tags:
 *       - usuário
 */


router.get('/me', 
    passport.authenticate('jwt', { session: false}),
    async (req, res) => {
    res.json({
        sucesso: true,
        usuario: req.user,
        saldo: await checaSaldo(req.user),
    })
});

module.exports = router;