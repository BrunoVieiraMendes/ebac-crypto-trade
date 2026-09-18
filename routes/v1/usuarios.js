const express = require('express');
const { criaUsuario, checaSaldo, geraSegredo } = require('../../services');
const { Usuario } = require('../../models');
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
 *               redirectRelativo:
 *                 summary: Redirect sem http:// ou https://
 *                 value:
 *                   sucesso: false
 *                   erro: 'A URL de redirecionamento deve comecar com http:// ou https://'
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


/**
 * @openapi
 * /v1/usuarios/senha:
 *   put:
 *     summary: Altera a senha do usuário
 *     description: >
 *       Troca a senha do usuário autenticado. Serve tanto para quem já está logado
 *       quanto para o fim do fluxo de recuperação, usando o JWT devolvido por
 *       GET /v1/auth/valida-token. Ao trocar a senha, o token de recuperação é
 *       invalidado, então o link recebido por e-mail deixa de funcionar.
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Nova senha do usuário
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlteraSenhaRequest'
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensagemResponse'
 *             example:
 *               sucesso: true
 *               mensagem: Senha alterada com sucesso
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: Senha inválida ou não informada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
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
 *     tags:
 *       - usuário
 */

router.put('/senha',
    passport.authenticate('jwt', { session: false}),
    async(req, res) => {
    const { senha } = req.body;

    try {
        if (!senha) {
            throw new Error('O campo senha e obrigatorio');
        }

        if (senha.length <= 4) {
            throw new Error('O campo senha de ter no minimo 5 caracteres');
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // troca a senha e invalida o token de recuperacao (remove o campo, porque
        // o indice e unique + sparse e nao aceita varios documentos com null)
        await Usuario.updateOne(
            { _id: req.user._id },
            {
                $set: { senha: senhaCriptografada },
                $unset: { tokenDeRecuperacao: 1 },
            },
        );

        res.json({
            sucesso: true,
            mensagem: 'Senha alterada com sucesso',
        });
    } catch (e) {
        logger.error(`Erro na alteracao de senha: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});


router.post('/otp',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        const usuario = req.user;

        try {
            const { segredo, qrcode } = geraSegredo(usuario.email);

            usuario.segredoOtp = segredo;
            await usuario.save();

            return res.send(qrcode);
        } catch (e) {
            logger.error(`Erro na geração do segredo do TOTP ${e.message}`);

            return res.status(500).json({
                sucesso: false,
                erro: e.message,
            });
        }
    }
);




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