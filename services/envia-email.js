const path = require('path');

const crypto = require('crypto');

const nodemailer = require('nodemailer');
const ejs = require('ejs');
const jsonWebToken = require('jsonwebtoken');

const { Usuario } = require('../models');
const { ehUrlDeRedirecionamentoValida } = require('../utils');

// caminhos absolutos dos templates, para nao depender de onde o node foi iniciado
const templatesDeConfirmacao = path.join(__dirname, '..', 'emails', 'confirmacao');
const templatesDeRecuperacao = path.join(__dirname, '..', 'emails', 'recuperacao-de-senha');
const templatesDeParabenizacao = path.join(__dirname, '..', 'emails', 'parabenizacao');


const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
});

const enviaEmailDeConfirmacao = async (usuario, urlDeRedirecionamento) => {
    if (!ehUrlDeRedirecionamentoValida(urlDeRedirecionamento)) {
        throw new Error('A URL de redirecionamento deve comecar com http:// ou https://');
    }

    const parametros = {
        nome: usuario.nome,
        linkDeConfirmacao: `${process.env.URL_DA_CRYPTOTRADE}/v1/auth/confirma-conta?token=${encodeURIComponent(usuario.tokenDeConfirmacao)}&redirect=${encodeURIComponent(urlDeRedirecionamento)}`
    };

    await transporter.sendMail({
        from: '"CryptoTrade" <noreply@cryptotrade.com.br>',
        to: usuario.email,
        subject: 'Confirme a sua conta!',
        text: await ejs.renderFile(path.join(templatesDeConfirmacao, 'template.txt'), parametros),
        html: await ejs.renderFile(path.join(templatesDeConfirmacao, 'template.html'), parametros),
    });
};


const enviaEmailDeRecuperacao = async (email, urlDeRedirecionamento) => {
    if (!urlDeRedirecionamento) {
        throw new Error('Deve ser enviado um parâmetro com a URL de redirecionamento');
    }

    if (!ehUrlDeRedirecionamentoValida(urlDeRedirecionamento)) {
        throw new Error('A URL de redirecionamento deve comecar com http:// ou https://');
    }

    if (!email) {
        throw new Error('Deve ser enviado um parâmetro com o email que deseja pedir a recuperação');
    }

    const usuario = await Usuario.findOne({ email });

    // se o email nao existe nao fazemos nada: a rota responde sempre a mesma
    // mensagem generica para nao revelar quem tem cadastro
    if (!usuario) {
        return;
    }

    // gera um token novo a cada pedido e invalida os links anteriores
    const tokenDeRecuperacao = crypto.randomBytes(32).toString('hex');
    usuario.tokenDeRecuperacao = tokenDeRecuperacao;
    await usuario.save();

    const token = jsonWebToken.sign(
        { token: tokenDeRecuperacao },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '5 minutes' },
    );

    const parametros = {
        nome: usuario.nome,
        linkDeRecuperacao: `${process.env.URL_DA_CRYPTOTRADE}/v1/auth/valida-token?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(urlDeRedirecionamento)}`,
    };

    await transporter.sendMail({
        from: '"CryptoTrade" <noreply@cryptotrade.com.br>',
        to: usuario.email,
        subject: 'Pedido de recuperação de senha!',
        text: await ejs.renderFile(path.join(templatesDeRecuperacao, 'template.txt'), parametros),
        html: await ejs.renderFile(path.join(templatesDeRecuperacao, 'template.html'), parametros),
    });
};


const enviaEmailDeParabenizacao = async (usuario, lucro) => {
    const parametros = {
        nome: usuario.nome,
        lucro: lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        linkDaCryptoTrade: `${process.env.URL_DA_CRYPTOTRADE}/v1/cotacoes`,
    };

    await transporter.sendMail({
        from: '"CryptoTrade" <noreply@cryptotrade.com.br>',
        to: usuario.email,
        subject: 'Parabens pelos seus trades de ontem!',
        text: await ejs.renderFile(path.join(templatesDeParabenizacao, 'template.txt'), parametros),
        html: await ejs.renderFile(path.join(templatesDeParabenizacao, 'template.html'), parametros),
    });
};


module.exports = {
    enviaEmailDeConfirmacao,
    enviaEmailDeRecuperacao,
    enviaEmailDeParabenizacao,
};
