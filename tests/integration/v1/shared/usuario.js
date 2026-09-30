const bcrypt = require('bcrypt');
const faker = require('faker-br');
const jsonwebtoken = require('jsonwebtoken');
const { generateSecret, generateSync } = require('otplib');

const { Usuario } = require('../../../../models');

const SENHA = 'senha@1234';

const criaUsuario = async (dados = {}) => Usuario.create({
    nome: faker.name.findName(),
    email: faker.internet.email().toLowerCase(),
    cpf: faker.br.cpf(),
    senha: await bcrypt.hash(SENHA, 10),
    confirmado: true,
    ...dados,
});

// usuario confirmado + JWT pronto para o header Authorization
const criaUsuarioLogado = async (dados = {}) => {
    const usuario = await criaUsuario(dados);
    const jwt = jsonwebtoken.sign({ id: usuario._id }, process.env.JWT_SECRET_KEY);

    return { usuario, jwt };
};

// usuario com o 2FA ja ativado; geraOtp devolve o codigo atual do "aplicativo"
const criaUsuarioCom2fa = async (dados = {}) => {
    const segredo = generateSecret();
    const logado = await criaUsuarioLogado({ segredoOtp: segredo, otpAtivo: true, ...dados });

    return {
        ...logado,
        segredo,
        geraOtp: () => generateSync({ secret: segredo }),
    };
};

module.exports = {
    SENHA,
    criaUsuario,
    criaUsuarioLogado,
    criaUsuarioCom2fa,
};
