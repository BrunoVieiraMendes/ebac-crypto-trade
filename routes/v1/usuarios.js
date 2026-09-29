const express = require('express');
const { criaUsuario, checaSaldo, geraSegredo, validaOtp } = require('../../services');
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


/**
 * @openapi
 * /v1/usuarios/otp:
 *   post:
 *     summary: Gera o QR Code do 2FA
 *     description: >
 *       Gera um segredo TOTP para o usuário autenticado e devolve o QR Code (SVG) para ser
 *       lido no Google Authenticator, Authy ou similar. O 2FA só passa a valer depois de
 *       confirmar um código em POST /v1/usuarios/otp/valida. Se o 2FA já estiver ativo,
 *       é preciso desativar antes, para não invalidar o aplicativo já configurado.
 *     security:
 *       - auth: []
 *     responses:
 *       200:
 *         description: QR Code gerado (imagem SVG)
 *         content:
 *           image/svg+xml:
 *             schema:
 *               type: string
 *               example: '<svg xmlns="http://www.w3.org/2000/svg" ...></svg>'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: O usuário já tem o 2FA ativo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example:
 *               sucesso: false
 *               erro: O 2FA ja esta ativo. Desative antes de gerar um novo QR Code
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 *     tags:
 *       - usuário
 */

router.post('/otp',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        const usuario = req.user;

        try {
            if (usuario.otpAtivo) {
                return res.status(422).json({
                    sucesso: false,
                    erro: 'O 2FA ja esta ativo. Desative antes de gerar um novo QR Code',
                });
            }

            const { segredo, qrcode } = geraSegredo(usuario.email);

            // o segredo fica guardado, mas o 2FA so vale depois de confirmar um codigo
            await Usuario.updateOne(
                { _id: usuario._id },
                { $set: { segredoOtp: segredo, otpAtivo: false } },
            );

            return res.type('svg').send(qrcode);
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
 * /v1/usuarios/otp/valida:
 *   post:
 *     summary: Ativa o 2FA confirmando um código
 *     description: >
 *       Confirma que o aplicativo autenticador foi configurado corretamente e ativa o 2FA.
 *       A partir daí, o login em POST /v1/auth passa a exigir o campo `otp`.
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Código de 6 dígitos mostrado no aplicativo
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpRequest'
 *     responses:
 *       200:
 *         description: 2FA ativado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensagemResponse'
 *             example:
 *               sucesso: true
 *               mensagem: 2FA ativado com sucesso
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: Código inválido ou QR Code ainda não gerado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               semSegredo:
 *                 summary: Nenhum QR Code foi gerado ainda
 *                 value:
 *                   sucesso: false
 *                   erro: Gere o QR Code em POST /v1/usuarios/otp antes de ativar o 2FA
 *               codigoInvalido:
 *                 summary: Código errado ou expirado
 *                 value:
 *                   sucesso: false
 *                   erro: Codigo OTP invalido
 *     tags:
 *       - usuário
 */

router.post('/otp/valida',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        try {
            const { token } = req.body;

            // segredoOtp tem `select: false`, entao precisa ser pedido
            const usuario = await Usuario
                .findOne({ _id: req.user._id })
                .select('+segredoOtp');

            if (!usuario.segredoOtp) {
                throw new Error('Gere o QR Code em POST /v1/usuarios/otp antes de ativar o 2FA');
            }

            if (!validaOtp(usuario.segredoOtp, token)) {
                throw new Error('Codigo OTP invalido');
            }

            await Usuario.updateOne({ _id: usuario._id }, { $set: { otpAtivo: true } });

            return res.json({
                sucesso: true,
                mensagem: '2FA ativado com sucesso',
            });
        } catch (e) {
            logger.error(`Erro na ativacao do 2FA: ${e.message}`);

            return res.status(422).json({
                sucesso: false,
                erro: e.message,
            });
        }
    }
);


/**
 * @openapi
 * /v1/usuarios/otp:
 *   delete:
 *     summary: Desativa o 2FA
 *     description: >
 *       Desativa o segundo fator e apaga o segredo, confirmando um código do aplicativo.
 *       Depois disso o login volta a pedir apenas email e senha.
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Código de 6 dígitos mostrado no aplicativo
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpRequest'
 *     responses:
 *       200:
 *         description: 2FA desativado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensagemResponse'
 *             example:
 *               sucesso: true
 *               mensagem: 2FA desativado com sucesso
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: Código inválido ou 2FA não estava ativo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               naoAtivo:
 *                 summary: 2FA não estava ativo
 *                 value:
 *                   sucesso: false
 *                   erro: O 2FA nao esta ativo nessa conta
 *               codigoInvalido:
 *                 summary: Código errado ou expirado
 *                 value:
 *                   sucesso: false
 *                   erro: Codigo OTP invalido
 *     tags:
 *       - usuário
 */

router.delete('/otp',
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        try {
            const { token } = req.body;

            const usuario = await Usuario
                .findOne({ _id: req.user._id })
                .select('+segredoOtp');

            if (!usuario.otpAtivo) {
                throw new Error('O 2FA nao esta ativo nessa conta');
            }

            if (!validaOtp(usuario.segredoOtp, token)) {
                throw new Error('Codigo OTP invalido');
            }

            // remove o campo (o indice e unique + sparse e nao aceita varios nulls)
            await Usuario.updateOne(
                { _id: usuario._id },
                { $set: { otpAtivo: false }, $unset: { segredoOtp: 1 } },
            );

            return res.json({
                sucesso: true,
                mensagem: '2FA desativado com sucesso',
            });
        } catch (e) {
            logger.error(`Erro na desativacao do 2FA: ${e.message}`);

            return res.status(422).json({
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