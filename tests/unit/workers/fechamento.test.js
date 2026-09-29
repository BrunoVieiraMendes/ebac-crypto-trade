const fechamentoWorker = require('../../../workers/fechamento');
const { Cotacao, FechamentoDiario } = require('../../../models');

const agora = new Date();
const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
const diaDeHoje = agora.toISOString().split('T')[0];

describe('se houver cotações de ontem e de hoje', () => {
    test('ele salva o fechamento do dia com as altas e as quedas', async () => {
        await Cotacao.create([
            { moeda: 'BTC', valor: 100, data: ontem },
            { moeda: 'ETH', valor: 100, data: ontem },
            { moeda: 'BTC', valor: 120, data: agora },
            { moeda: 'ETH', valor: 90, data: agora },
        ]);
        const done = jest.fn();

        await fechamentoWorker({}, done);

        expect(done).toHaveBeenCalledWith();

        const fechamento = await FechamentoDiario.findOne({ dia: diaDeHoje }).lean();
        expect(fechamento.gainers).toEqual([{ moeda: 'BTC', variacao: 20 }, { moeda: 'ETH', variacao: -10 }]);
        expect(fechamento.loosers).toEqual([{ moeda: 'ETH', variacao: -10 }, { moeda: 'BTC', variacao: 20 }]);
    });
});

describe('se faltarem cotações de um dos dias', () => {
    test('ele finaliza o job com erro e não salva nada', async () => {
        await Cotacao.create({ moeda: 'BTC', valor: 120, data: agora });
        const done = jest.fn();

        await fechamentoWorker({}, done);

        expect(done).toHaveBeenCalledWith(expect.objectContaining({ message: 'Dados insuficientes para comparar datas.' }));
        expect(await FechamentoDiario.countDocuments()).toBe(0);
    });
});
