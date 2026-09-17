const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { Usuario } = require('../models');
const { enviaEmailDeConfirmacao } = require('./envia-email');


const criaUsuario = async(usuario, urlDeRedirecionamento) => {
    if (!usuario.senha) {
        throw new Error('O campo senha e obrigatorio');
    }

    if (usuario.senha.length <= 4) {
        throw new Error('O campo senha de ter no minimo 5 caracteres');
    }

    const hashSenha = await bcrypt.hash(usuario.senha, 10);

    usuario.senha = hashSenha;

    const tokenDeConfirmacao = crypto.randomBytes(32).toString('hex');
    usuario.tokenDeConfirmacao = tokenDeConfirmacao;

    const { senha, tokenDeConfirmacao: _token, ...usuarioSalvo } = (await Usuario.create(usuario))._doc;

    // o token vai apenas para o e-mail de confirmacao, nunca na resposta da API
    await enviaEmailDeConfirmacao(
        { ...usuarioSalvo, tokenDeConfirmacao },
        urlDeRedirecionamento
    );

    return usuarioSalvo;
};

module.exports = criaUsuario;