const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

const { Usuario } = require("../models");
const { validaOtp } = require('./otp');

const logaUsuario = async(email, senha, otp) => {
    if (!senha || !email) {
        throw new Error('Campo senha e email sao obrigatorios');
    }

    const usuario = await Usuario
        .findOne({ email: email })
        .select('senha confirmado otpAtivo +segredoOtp');

    if (!usuario) {
        throw new Error('Usuario nao encontrado');
    }

       if (!usuario.confirmado) {
        throw new Error('Usuario nao confirmado! Cheque seu email para logar');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
        throw new Error('Email ou Senha Invalida');
    }

    // segundo fator: so e cobrado de quem ativou o 2FA
    if (usuario.otpAtivo) {
        if (!otp) {
            throw new Error('Informe o codigo OTP do seu aplicativo autenticador');
        }

        if (!validaOtp(usuario.segredoOtp, otp)) {
            throw new Error('Codigo OTP invalido');
        }
    }

    return jwt.sign({ id: usuario._id }, process.env.JWT_SECRET_KEY);
};

module.exports = logaUsuario;
