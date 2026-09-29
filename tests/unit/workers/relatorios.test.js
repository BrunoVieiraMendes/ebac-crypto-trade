const { cpf } = require('cpf-cnpj-validator');

const relatoriosWorker = require('../../../workers/relatorios');
const { Usuario, Relatorio, Cotacao } = require('../../../models');

const criaUsuario = (indice, moedas = []) => Usuario.create({
    email: `usuario${indice}@ebac.com.br`,
    senha: 'senha-criptografada',
    cpf: cpf.generate(true),
    nome: `Usuário ${indice}`,
    moedas,
});

describe('se não houver usuários', () => {
    test('ele não cria relatórios e finaliza o job', async () => {
        const done = jest.fn();

        await relatoriosWorker({}, done);

        expect(done).toHaveBeenCalledWith();
        expect(await Relatorio.countDocuments()).toBe(0);
    });
});

describe('se houver usuários', () => {
    test('ele cria um relatório com o saldo em BRL de cada usuário', async () => {
        await Cotacao.create({ moeda: 'BTC', valor: 1000, data: new Date() });
        const rico = await criaUsuario(1, [{ codigo: 'BRL', quantidade: 500 }, { codigo: 'BTC', quantidade: 2 }]);
        const semSaldo = await criaUsuario(2);
        const done = jest.fn();

        await relatoriosWorker({}, done);

        expect(done).toHaveBeenCalledWith();
        expect((await Relatorio.findOne({ usuarioId: rico._id })).saldo).toBe(2500);
        expect((await Relatorio.findOne({ usuarioId: semSaldo._id })).saldo).toBe(0);
    });

    test('ele passa por todas as páginas de usuários', async () => {
        // a pagina tem 10 usuarios, entao 25 usuarios precisam de 3 paginas
        for (let i = 0; i < 25; i++) {
            await criaUsuario(i);
        }
        const done = jest.fn();

        await relatoriosWorker({}, done);

        expect(await Relatorio.countDocuments()).toBe(25);
        expect((await Relatorio.distinct('usuarioId')).length).toBe(25);
    });
});
