const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { Usuario } = require('../models');

//TODO
// const { enviaEmailDeConfimacao } = require('./envia-email');


const criaUsuario = async(usuario, urlDeRedirecionamento) => {
    if (!usuario.senha) {
        throw new Error('O campo senha e obrigatorio');
    }

    if (usuario.senha.length <= 4) {
        throw new Error('O campo senha de ter no minimo 5 caracteres');
    }

    const hashSenha = await bcrypt.hash(usuario.senha, 10);

    usuario.senha = hashSenha;

    usuario.tokenDeComfirmacao = crypto.randomBytes(32).toString('hex');

    const { senha, ...usuarioSalvo } = (await Usuario.create(usuario))._doc;

// TODO
// await enviaEmailDeConfirmacao(usuarioSalvo, urlDeRedirecionamento);

    return usuarioSalvo;
};

module.exports = criaUsuario;