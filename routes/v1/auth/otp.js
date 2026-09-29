const { Usuario } = require('../../../models');

const { validaOtp } = require('../../../services');

const checaOtp = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            sucesso: false,
            erro: 'Para prosseguir faca login',
        });
    }

    try {
        // segredoOtp tem `select: false`, entao precisa ser pedido
        const usuario = await Usuario
            .findById(req.user._id)
            .select('+segredoOtp otpAtivo');
        const token = req.get('totp');

        // so vale se o 2FA foi confirmado em /v1/usuarios/otp/valida
        if (usuario && usuario.otpAtivo && validaOtp(usuario.segredoOtp, token)) {
            return next();
        }

        return res.status(401).json({
            sucesso: false,
            erro: 'OTP inválido ou não configurado! Essa rota necessita da configuracao e uso do OTP enviado por Headers'
        });
    } catch (e) {
        return next(e);
    }
};

module.exports = { checaOtp };
