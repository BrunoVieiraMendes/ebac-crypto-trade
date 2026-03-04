const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

const { Usuario } = require("../models");

const logaUsuario = async(email, senha) => {
    if (!senha || !email) {
        throw new Error('Campo senha e email sao obrigatorios');
    }

    const usuario = await Usuario.findOne({ email: email }).select('senha');

    if (!usuario) {
        throw new Error('Usuario nao encontrado');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
        throw new Error('Email ou Senha Invalida');
    }

    return jwt.sign({ id: usuario._id }, process.env.JWT_SECRET_KEY);
};

module.exports = logaUsuario;