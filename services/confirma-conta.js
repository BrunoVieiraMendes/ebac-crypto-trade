const { Usuario } = require('../models');

const confirmaConta = async (token) => {
    if (!token || typeof token !== 'string') {
        throw new Error('Token de confirmação não informado');
    }

    // tokenDeConfirmacao tem `select: false` no schema, entao precisa ser
    // pedido explicitamente para podermos limpa-lo depois da confirmacao
    const usuario = await Usuario
        .findOne({ tokenDeConfirmacao: token })
        .select('+tokenDeConfirmacao');

    if (!usuario) {
        throw new Error('Usuário não encontrado!');
    } else {
        usuario.confirmado = true;
        usuario.set('tokenDeConfirmacao', undefined);

        await usuario.save();

        return usuario;
    }
};

module.exports = confirmaConta;