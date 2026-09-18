const jsonWebToken = require('jsonwebtoken');

const { Usuario } = require('../models');

const validaTokenSenha = async (token) => {
    try {
        const jwt = jsonWebToken.verify(token, process.env.JWT_SECRET_KEY);
        const usuario = await Usuario.findOne({ tokenDeRecuperacao: jwt.token });

        if (!usuario) {
            throw new Error('Token não encontrado!');
        }

        return jsonWebToken.sign({ id: usuario._id }, process.env.JWT_SECRET_KEY);
    } catch (e) {
        throw new Error('Token não encontrado ou expirado. Requisite um novo!');
    }
};

module.exports = validaTokenSenha;