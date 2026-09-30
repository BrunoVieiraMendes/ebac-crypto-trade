const deposita = require('../../../services/deposita');
const { Usuario } = require('../../../models');

const usuarioMock = {
    email: 'test@ebac.com.br',
    senha: 'senha-criptografada',
    cpf: '301.372.350-54',
    nome: 'Usuário de teste',
    confirmado: true,
    moedas: [{ codigo: 'BRL', quantidade: 1000 }],
};

const reaisDe = (usuario) => usuario.moedas.find(m => m.codigo === 'BRL')?.quantidade;

describe('se o valor for inválido', () => {
    test('ele dá um erro para valor não informado, zero ou negativo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        for (const valor of [undefined, 0, -100]) {
            await expect(() => deposita(usuario, valor)).rejects.toThrow('Voce deve informar um valor maior que zero para depositar');
        }
    });

    test('ele recusa valor em texto, que antes era concatenado ao saldo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        await expect(() => deposita(usuario, '100')).rejects.toThrow('Voce deve informar um valor maior que zero para depositar');

        expect(reaisDe(await Usuario.findById(usuario._id))).toBe(1000);
    });
});

describe('se o valor for menor que o mínimo de 100', () => {
    test('ele dá erro de validação', async () => {
        const usuario = await Usuario.create(usuarioMock);

        return expect(() => deposita(usuario, 99)).rejects.toThrow('is less than minimum allowed value (100)');
    });

    test('ele não salva o depósito nem altera o saldo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        await expect(() => deposita(usuario, 99)).rejects.toThrow();

        const usuarioNoBanco = await Usuario.findById(usuario._id);
        expect(usuarioNoBanco.depositos).toHaveLength(0);
        expect(reaisDe(usuarioNoBanco)).toBe(1000);
    });
});

describe('se o valor for válido', () => {
    test('ele soma o valor aos reais do usuário e devolve o saldo', async () => {
        const usuario = await Usuario.create(usuarioMock);

        const { saldo } = await deposita(usuario, 250);

        expect(saldo).toBe(1250);
        expect(reaisDe(await Usuario.findById(usuario._id))).toBe(1250);
    });

    test('ele cria o saldo em reais se o usuário ainda não tiver', async () => {
        const usuario = await Usuario.create({ ...usuarioMock, moedas: [] });

        const { saldo } = await deposita(usuario, 100);

        expect(saldo).toBe(100);
        expect(reaisDe(await Usuario.findById(usuario._id))).toBe(100);
    });

    test('ele registra o depósito no histórico, não cancelado', async () => {
        const usuario = await Usuario.create(usuarioMock);

        const { depositos } = await deposita(usuario, 150);

        expect(depositos).toHaveLength(1);
        expect(depositos[0].valor).toBe(150);
        expect(depositos[0].cancelado).toBe(false);
        expect(depositos[0].data).toEqual(expect.any(Date));
    });

    test('ele acumula vários depósitos', async () => {
        const usuario = await Usuario.create(usuarioMock);

        await deposita(usuario, 100);
        const { saldo, depositos } = await deposita(usuario, 200);

        expect(saldo).toBe(1300);
        expect(depositos).toHaveLength(2);
    });
});
