const jsonWebToken = require('jsonwebtoken');

const { Usuario } = require('../models');

const validaTokenSenha = async (token) => {
    try {
        const jwt = jsonWebToken.verify(token, process.env.JWT_SECRET_KEY);

        if (!jwt.token) {
            throw new Error('Token sem a informacao de recuperacao');
        }

        // tokenDeRecuperacao tem `select: false`, entao precisa ser pedido
        const usuario = await Usuario
            .findOne({ tokenDeRecuperacao: jwt.token })
            .select('+tokenDeRecuperacao');

        if (!usuario) {
            throw new Error('Token não encontrado!');
        }

        // esse JWT serve apenas para trocar a senha logo em seguida
        return jsonWebToken.sign(
            { id: usuario._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '15 minutes' },
        );
    } catch (e) {
        throw new Error('Token não encontrado ou expirado. Requisite um novo!');
    }
};

module.exports = validaTokenSenha;
