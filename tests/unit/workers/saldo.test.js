const saldoWorker = require('../../../workers/saldo');
const { Corretora } = require('../../../models');
const { CNPJ, RESERVA_MINIMA } = require('../../../constants');

const job = { attemptsMade: 0, opts: { attempts: 3 } };

describe('se o caixa da corretora estiver abaixo da reserva mínima', () => {
    test('ele soma a reserva mínima ao caixa', async () => {
        await Corretora.create({ cnpj: CNPJ, caixa: 1000 });
        const done = jest.fn();

        await saldoWorker(job, done);

        expect(done).toHaveBeenCalledWith();
        expect((await Corretora.findOne({ cnpj: CNPJ })).caixa).toBe(1000 + RESERVA_MINIMA);
    });
});

describe('se o caixa da corretora já tiver a reserva mínima', () => {
    test('ele não altera o caixa', async () => {
        await Corretora.create({ cnpj: CNPJ, caixa: RESERVA_MINIMA });
        const done = jest.fn();

        await saldoWorker(job, done);

        expect(done).toHaveBeenCalledWith();
        expect((await Corretora.findOne({ cnpj: CNPJ })).caixa).toBe(RESERVA_MINIMA);
    });
});

describe('se a corretora não existir', () => {
    test('ele finaliza o job com erro', async () => {
        const done = jest.fn();

        await saldoWorker(job, done);

        expect(done).toHaveBeenCalledWith(expect.any(Error));
    });
});
