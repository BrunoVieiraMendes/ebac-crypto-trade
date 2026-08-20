const express = require('express');
const passport = require('passport');

require('./auth/jwt');

const statusRouter = require('./status');
const usuariosRouter = require('./usuarios');
const authRouter = require('./auth');
const depositosRouter = require('./depositos');
const saquesRouter = require('./saques');
const cotacoesRouter = require('./cotacoes');
const trocasRouter = require('./trocas');
const topClientsRouter = require('./top-clients');

const router = express.Router();

router.use('/status', statusRouter);
router.use('/usuarios', usuariosRouter);
router.use('/auth', authRouter);
router.use('/cotacoes', cotacoesRouter);
router.use('/trocas', passport.authenticate('jwt', {session: false }), trocasRouter);
router.use('/depositos', passport.authenticate('jwt', {session: false }), depositosRouter);
router.use('/saques', passport.authenticate('jwt', {session: false }), saquesRouter); 
router.use('/top-clients', topClientsRouter);

module.exports = router;
