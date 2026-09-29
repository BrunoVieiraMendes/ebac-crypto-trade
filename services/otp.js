const qrcode = require('qr-image');
const { generateSecret, generateURI, verifySync } = require('otplib');

const EMISSOR = 'CryptoTrade';

const geraSegredo = (email) => {
    const segredo = generateSecret();

    const otpauth = generateURI({
        secret: segredo,
        label: email,
        issuer: EMISSOR,
    });

    const imagem = qrcode.imageSync(otpauth, { type: 'svg' });

    return {
        segredo,
        qrcode: imagem,
        otpauth,
    };
};

const validaOtp = (segredo, token) => {
    if (!segredo || !token) {
        return false;
    }

    try {
        // na otplib 13 o verifySync devolve { valid, delta... }, e nao um booleano
        return verifySync({ secret: segredo, token: String(token).trim() }).valid === true;
    } catch (e) {
        // token com formato invalido (letras, tamanho errado etc)
        return false;
    }
};

module.exports = {
    geraSegredo,
    validaOtp,
}
