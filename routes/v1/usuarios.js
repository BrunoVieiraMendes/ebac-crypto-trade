const express = require('express');
const { criaUsuario, checaSaldo } = require('../../services');
const logger = require('../../utils/logger');
const passport = require('passport');

const router = express.Router();

router.post('/', async(req, res) => {
    const dados = req.body.usuario;

    try {
        const usuario = await criaUsuario(dados);

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

router.get('/me', 
    passport.authenticate('jwt', { session: false}), async (req, res) => {
    res.json({
        sucesso: true,
        usuario: req.user,
        saldo: await checaSaldo(req.user),
    })
});

module.exports = router;