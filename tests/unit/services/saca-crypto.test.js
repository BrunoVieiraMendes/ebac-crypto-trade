const sacaCrypto = require('../../../services/saca-crypto');
const { Usuario } = require('../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    confirmado: true,
    moedas: [
        { codigo: 'BRL', quantidade: 1000 },
        { codigo: 'BTC', quantidade: 2 },
    ],
};

const quantidadeDe = (moedas, codigo) => moedas.find(m => m.codigo === codigo).quantidade;

describe('se o valor for inválido', () => {
    test('ele dá um erro para valor zero, negativo ou não numérico', async () => {
        const usuario = await Usuario.create(usuarioMock);

        await expect(() => sacaCrypto(usuario, 'BTC', 0)).rejects.toThrow('Voce deve informar um valor maior que zero para sacar');
        await expect(() => sacaCrypto(usuario, 'BTC', -1)).rejects.toThrow('Voce deve informar um valor maior que zero para sacar');
        await expect(() => sacaCrypto(usuario, 'BTC', '1')).rejects.toThrow('Voce deve informar um valor maior que zero para sacar');
    });
});

describe('se o usuário não tiver saldo suficiente', () => {
    test('ele dá um erro de saldo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        return expect(() => sacaCrypto(usuario, 'BTC', 3)).rejects.toThrow('Voce nao possui saldo para sacar esse valor!');
    });

    test('ele dá um erro se o usuário não tiver a moeda', async () => {
        const usuario = await Usuario.create(usuarioMock);

        return expect(() => sacaCrypto(usuario, 'ETH', 1)).rejects.toThrow('Voce nao possui saldo para sacar esse valor!');
    });

    test('ele não altera a carteira', async () => {
        const usuario = await Usuario.create(usuarioMock);

        await expect(() => sacaCrypto(usuario, 'BTC', 3)).rejects.toThrow();

        const usuarioNoBanco = await Usuario.findById(usuario._id);
        expect(quantidadeDe(usuarioNoBanco.moedas, 'BTC')).toBe(2);
    });
});

describe('se o usuário tiver saldo suficiente', () => {
    test('ele debita apenas a moeda sacada', async () => {
        const usuario = await Usuario.create(usuarioMock);

        const moedas = await sacaCrypto(usuario, 'BTC', 0.5);

        expect(quantidadeDe(moedas, 'BTC')).toBe(1.5);
        expect(quantidadeDe(moedas, 'BRL')).toBe(1000);
    });

    test('ele permite sacar todo o saldo da moeda', async () => {
        const usuario = await Usuario.create(usuarioMock);

        const moedas = await sacaCrypto(usuario, 'BTC', 2);

        expect(quantidadeDe(moedas, 'BTC')).toBe(0);
    });
});
