const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { Usuario } = require('../models');
const { enviaEmailDeConfirmacao } = require('./envia-email');
const { ehUrlDeRedirecionamentoValida } = require('../utils');


const criaUsuario = async(usuario, urlDeRedirecionamento) => {
    // valida tudo antes de gravar, para nao sobrar usuario sem e-mail de confirmacao
    if (!urlDeRedirecionamento) {
        throw new Error('A URL de redirecionamento é obrigatoria');
    }

    if (!ehUrlDeRedirecionamentoValida(urlDeRedirecionamento)) {
        throw new Error('A URL de redirecionamento deve comecar com http:// ou https://');
    }

    if (!usuario.senha) {
        throw new Error('O campo senha e obrigatorio');
    }

    // a senha pode chegar como numero no JSON (ex. 123)
    usuario.senha = String(usuario.senha);

    if (usuario.senha.length <= 4) {
        throw new Error('O campo senha deve ter no minimo 5 caracteres');
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