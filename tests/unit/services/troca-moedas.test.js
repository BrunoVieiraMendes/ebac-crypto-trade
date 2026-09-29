const trocaMoedas = require('../../../services/troca-moedas');
const { Usuario, Cotacao, Corretora } = require('../../../models');
const { CNPJ, TAXA_DE_TROCA } = require('../../../constants');

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

const VALOR_DO_BTC = 100;

const quantidadeDe = (moedas, codigo) => moedas.find(m => m.codigo === codigo)?.quantidade;

let usuario;
let cotacao;

beforeEach(async () => {
    usuario = await Usuario.create(usuarioMock);
    cotacao = await Cotacao.create({ moeda: 'BTC', valor: VALOR_DO_BTC, data: new Date() });
    await Corretora.create({ cnpj: CNPJ, caixa: 100000 });
});

describe('se a quantidade ou a operação não forem informadas', () => {
    test('ele dá um erro pedindo os dois campos', async () => {
        await expect(() => trocaMoedas(usuario, cotacao._id, undefined, 'compra')).rejects.toThrow('Voce deve informar a quantidade desejada e a operacao');
        await expect(() => trocaMoedas(usuario, cotacao._id, 1, undefined)).rejects.toThrow('Voce deve informar a quantidade desejada e a operacao');
    });
});

describe('se a operação for inválida', () => {
    test('ele dá um erro pedindo compra ou venda', () => {
        return expect(() => trocaMoedas(usuario, cotacao._id, 1, 'emprestimo')).rejects.toThrow('Operacao invalida! Use compra ou venda');
    });
});

describe('se a quantidade for inválida', () => {
    test('ele dá um erro para quantidade negativa ou não numérica', async () => {
        await expect(() => trocaMoedas(usuario, cotacao._id, -1, 'compra')).rejects.toThrow('A quantidade deve ser um numero maior que zero');
        await expect(() => trocaMoedas(usuario, cotacao._id, '1', 'compra')).rejects.toThrow('A quantidade deve ser um numero maior que zero');
    });
});

describe('se a cotação estiver expirada', () => {
    test('ele dá um erro de cotação inválida', async () => {
        const vinteMinutosAtras = new Date(Date.now() - 20 * 60000);
        const cotacaoVelha = await Cotacao.create({ moeda: 'BTC', valor: VALOR_DO_BTC, data: vinteMinutosAtras });

        return expect(() => trocaMoedas(usuario, cotacaoVelha._id, 1, 'compra')).rejects.toThrow('Cotacao invalida ou expirada!');
    });
});

describe('se a corretora não tiver caixa', () => {
    test('ele dá um erro de caixa insuficiente', async () => {
        await Corretora.updateOne({ cnpj: CNPJ }, { caixa: 50 });

        return expect(() => trocaMoedas(usuario, cotacao._id, 1, 'compra')).rejects.toThrow('Valor muito grande, nao temos caixa no momento para essa operacao');
    });
});

describe('se a corretora não existir', () => {
    test('ele dá um erro pedindo para rodar o seed', async () => {
        await Corretora.deleteMany();

        return expect(() => trocaMoedas(usuario, cotacao._id, 1, 'compra')).rejects.toThrow('Corretora nao encontrada! Rode o seed do banco');
    });
});

describe('se o usuário comprar crypto', () => {
    test('ele dá um erro se não tiver reais suficientes', () => {
        return expect(() => trocaMoedas(usuario, cotacao._id, 11, 'compra')).rejects.toThrow('Voce nao possui saldo o suficiente para essa operacao! deposite mais dinheiro');
    });

    test('ele debita os reais e credita a crypto descontando a taxa', async () => {
        const moedas = await trocaMoedas(usuario, cotacao._id, 1, 'compra');

        expect(quantidadeDe(moedas, 'BRL')).toBeCloseTo(1000 - VALOR_DO_BTC);
        expect(quantidadeDe(moedas, 'BTC')).toBeCloseTo(2 + 1 - TAXA_DE_TROCA);
    });

    test('ele adiciona a moeda na carteira se o usuário ainda não tiver', async () => {
        const cotacaoEth = await Cotacao.create({ moeda: 'ETH', valor: 10, data: new Date() });

        const moedas = await trocaMoedas(usuario, cotacaoEth._id, 1, 'compra');

        expect(quantidadeDe(moedas, 'ETH')).toBeCloseTo(1 - TAXA_DE_TROCA);
    });

    test('ele soma a taxa no caixa da corretora', async () => {
        await trocaMoedas(usuario, cotacao._id, 1, 'compra');

        const corretora = await Corretora.findOne({ cnpj: CNPJ });
        expect(corretora.caixa).toBeCloseTo(100000 + TAXA_DE_TROCA * VALOR_DO_BTC);
    });
});

describe('se o usuário vender crypto', () => {
    test('ele dá um erro se não tiver crypto suficiente', () => {
        return expect(() => trocaMoedas(usuario, cotacao._id, 3, 'venda')).rejects.toThrow('Voce nao possui saldo o suficiente para essa operacao! Compre mais cryptos!');
    });

    test('ele debita a crypto e credita os reais descontando a taxa', async () => {
        const moedas = await trocaMoedas(usuario, cotacao._id, 1, 'venda');

        expect(quantidadeDe(moedas, 'BTC')).toBeCloseTo(1);
        expect(quantidadeDe(moedas, 'BRL')).toBeCloseTo(1000 + VALOR_DO_BTC - TAXA_DE_TROCA * VALOR_DO_BTC);
    });

    test('ele cria o saldo em BRL se o usuário ainda não tiver', async () => {
        const semReais = await Usuario.create({
            ...usuarioMock,
            email: 'semreais@ebac.com.br',
            cpf: '529.982.247-25',
            moedas: [{ codigo: 'BTC', quantidade: 1 }],
        });

        const moedas = await trocaMoedas(semReais, cotacao._id, 1, 'venda');

        expect(quantidadeDe(moedas, 'BRL')).toBeCloseTo(VALOR_DO_BTC - TAXA_DE_TROCA * VALOR_DO_BTC);
    });

    test('ele salva a carteira no banco', async () => {
        await trocaMoedas(usuario, cotacao._id, 1, 'venda');

        const usuarioNoBanco = await Usuario.findById(usuario._id);
        expect(quantidadeDe(usuarioNoBanco.moedas, 'BTC')).toBeCloseTo(1);
    });
});
