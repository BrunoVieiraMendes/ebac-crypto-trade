const sacaReais = require('../../../services/saca-reais');
const { Usuario, Cotacao } = require('../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    confirmado: true,
    moedas: [{ codigo: 'BRL', quantidade: 1000 }],
};

const reaisDe = (usuario) => usuario.moedas.find(m => m.codigo === 'BRL').quantidade;

describe('se o valor for inválido', () => {
    test('ele dá um erro para valor não informado, zero, negativo ou em texto', async () => {
        const usuario = await Usuario.create(usuarioMock);

        for (const valor of [undefined, 0, -10, '100']) {
            await expect(() => sacaReais(usuario, valor)).rejects.toThrow('Voce deve informar um valor maior que zero para sacar');
        }
    });

    test('ele não altera o saldo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        await expect(() => sacaReais(usuario, '100')).rejects.toThrow();

        expect(reaisDe(await Usuario.findById(usuario._id))).toBe(1000);
    });
});

describe('se o usuário não tiver saldo suficiente', () => {
    test('ele dá um erro de saldo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        return expect(() => sacaReais(usuario, 1001)).rejects.toThrow('Voce nao possui saldo para sacar esse dinheiro');
    });

    test('ele dá um erro se o usuário não tiver nenhuma moeda', async () => {
        const usuario = await Usuario.create({ ...usuarioMock, moedas: [] });

        return expect(() => sacaReais(usuario, 10)).rejects.toThrow('Voce nao possui saldo para sacar esse dinheiro');
    });
});

describe('se o saldo total der, mas o saldo em reais não', () => {
    test('ele dá um erro de saldo em reais', async () => {
        // 100 em BRL + 1 BTC valendo 5000: saldo total de 5100, mas so 100 em reais
        const usuario = await Usuario.create({
            ...usuarioMock,
            moedas: [{ codigo: 'BRL', quantidade: 100 }, { codigo: 'BTC', quantidade: 1 }],
        });
        await Cotacao.create({ moeda: 'BTC', valor: 5000, data: new Date() });

        return expect(() => sacaReais(usuario, 500)).rejects.toThrow('Voce nao possui saldo em reais para sacar esse dinheiro');
    });

    test('ele dá um erro se o usuário só tiver crypto', async () => {
        const usuario = await Usuario.create({ ...usuarioMock, moedas: [{ codigo: 'BTC', quantidade: 1 }] });
        await Cotacao.create({ moeda: 'BTC', valor: 5000, data: new Date() });

        return expect(() => sacaReais(usuario, 500)).rejects.toThrow('Voce nao possui saldo em reais para sacar esse dinheiro');
    });
});

describe('se o usuário tiver saldo em reais', () => {
    test('ele debita o valor e devolve o saldo restante', async () => {
        const usuario = await Usuario.create(usuarioMock);

        const { saldo } = await sacaReais(usuario, 300);

        expect(saldo).toBe(700);
        expect(reaisDe(await Usuario.findById(usuario._id))).toBe(700);
    });

    test('ele registra o saque no histórico', async () => {
        const usuario = await Usuario.create(usuarioMock);

        const { saques } = await sacaReais(usuario, 300);

        expect(saques).toHaveLength(1);
        expect(saques[0].valor).toBe(300);
        expect(saques[0].data).toEqual(expect.any(Date));
        expect((await Usuario.findById(usuario._id)).saques).toHaveLength(1);
    });

    test('ele permite sacar todo o saldo em reais', async () => {
        const usuario = await Usuario.create(usuarioMock);

        const { saldo } = await sacaReais(usuario, 1000);

        expect(saldo).toBe(0);
    });
});

describe('se o saque for menor que o mínimo do banco (1)', () => {
    test('ele dá erro de validação e não altera o saldo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        await expect(() => sacaReais(usuario, 0.5)).rejects.toThrow('is less than minimum allowed value (1)');

        expect(reaisDe(await Usuario.findById(usuario._id))).toBe(1000);
    });
});
