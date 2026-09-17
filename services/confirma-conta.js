const { Usuario } = require('../models');

const confirmaConta = async (token) => {
    if (!token || typeof token !== 'string') {
        throw new Error('Token de confirmação não informado');
    }

    const usuario = await Usuario.findOne({ tokenDeConfirmacao: token });

    if (!usuario) {
        throw new Error('Usuário não encontrado!');
    } else {
        usuario.confirmado = true;
        usuario.tokenDeConfirmacao = undefined;

        await usuario.save();

        return usuario;
    }
};

module.exports = confirmaConta;