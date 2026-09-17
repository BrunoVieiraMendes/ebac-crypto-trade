const nodemailer = require('nodemailer');
const ejs = require('ejs');


const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
});

const enviaEmailDeConfirmacao = async (usuario, urlDeRedirecionamento) => {
    const parametros = {
        nome: usuario.nome,
        linkDeConfirmacao: `${process.env.URL_DA_CRYPTOTRADE}/v1/auth/confirma-conta?token=${encodeURIComponent(usuario.tokenDeConfirmacao)}&redirect=${encodeURIComponent(urlDeRedirecionamento)}`
    };

    await transporter.sendMail({
        from: '"CryptoTrade" <noreply@cryptotrade.com.br>',
        to: usuario.email,
        subject: 'Confirme a sua conta!',
        text: await ejs.renderFile('emails/confirmacao/template.txt', parametros),
        html: await ejs.renderFile('emails/confirmacao/template.html', parametros),
    });
};

module.exports = {
    enviaEmailDeConfirmacao,
};
