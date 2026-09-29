const checaSaldo = require('../../../services/checa-saldo');
const { Usuario, Cotacao } = require('../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    confirmado: true,
};

describe('se o usuário não tiver moedas', () => {
    test('ele devolve saldo zero', async () => {
        const usuario = await Usuario.create(usuarioMock);

        expect(await checaSaldo(usuario)).toBe(0);
    });
});

describe('se o usuário tiver apenas reais', () => {
    test('ele devolve o valor em BRL', async () => {
        const usuario = await Usuario.create({ ...usuarioMock, moedas: [{ codigo: 'BRL', quantidade: 250 }] });

        expect(await checaSaldo(usuario)).toBe(250);
    });
});

describe('se o usuário tiver cryptos', () => {
    test('ele converte cada crypto pela cotação e soma com os reais', async () => {
        const usuario = await Usuario.create({
            ...usuarioMock,
            moedas: [
                { codigo: 'BRL', quantidade: 100 },
                { codigo: 'BTC', quantidade: 2 },
                { codigo: 'ETH', quantidade: 3 },
            ],
        });
        await Cotacao.create({ moeda: 'BTC', valor: 1000, data: new Date() });
        await Cotacao.create({ moeda: 'ETH', valor: 50, data: new Date() });

        expect(await checaSaldo(usuario)).toBe(100 + 2 * 1000 + 3 * 50);
    });

    test('ele usa a cotação mais recente da moeda', async () => {
        const usuario = await Usuario.create({ ...usuarioMock, moedas: [{ codigo: 'BTC', quantidade: 1 }] });
        await Cotacao.create({ moeda: 'BTC', valor: 500, data: new Date('2026-01-01') });
        await Cotacao.create({ moeda: 'BTC', valor: 800, data: new Date('2026-06-01') });
        await Cotacao.create({ moeda: 'BTC', valor: 600, data: new Date('2026-03-01') });

        expect(await checaSaldo(usuario)).toBe(800);
    });
});

describe('se existir mais de um usuário', () => {
    test('ele soma apenas as moedas do usuário informado', async () => {
        const usuario = await Usuario.create({ ...usuarioMock, moedas: [{ codigo: 'BRL', quantidade: 100 }] });
        await Usuario.create({
            ...usuarioMock,
            email: 'outro@ebac.com.br',
            cpf: '529.982.247-25',
            moedas: [{ codigo: 'BRL', quantidade: 9999 }],
        });

        expect(await checaSaldo(usuario)).toBe(100);
    });
});
