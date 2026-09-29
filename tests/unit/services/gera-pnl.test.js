const mongoose = require('mongoose');

const geraPnl = require('../../../services/gera-pnl');
const { Relatorio } = require('../../../models');

const usuario = { _id: new mongoose.Types.ObjectId() };

const horasAtras = (horas) => new Date(Date.now() - horas * 60 * 60 * 1000);

const criaRelatorio = (saldo, data, usuarioId = usuario._id) => Relatorio.create({ usuarioId, saldo, data });

describe('se o usuário não tiver relatórios nas últimas 24h', () => {
    test('ele devolve zero', async () => {
        await criaRelatorio(5000, horasAtras(48));

        expect(await geraPnl(usuario)).toBe(0);
    });
});

describe('se o usuário tiver apenas um relatório nas últimas 24h', () => {
    test('ele devolve o saldo desse relatório', async () => {
        await criaRelatorio(700, horasAtras(2));

        expect(await geraPnl(usuario)).toBe(700);
    });
});

describe('se o usuário tiver dois relatórios nas últimas 24h', () => {
    test('ele devolve a diferença entre o mais recente e o anterior', async () => {
        await criaRelatorio(1000, horasAtras(20));
        await criaRelatorio(1300, horasAtras(1));

        expect(await geraPnl(usuario)).toBe(300);
    });

    test('ele devolve valor negativo quando o saldo caiu', async () => {
        await criaRelatorio(1000, horasAtras(20));
        await criaRelatorio(400, horasAtras(1));

        expect(await geraPnl(usuario)).toBe(-600);
    });
});

describe('se existirem relatórios de outros usuários', () => {
    test('ele considera apenas os do usuário informado', async () => {
        await criaRelatorio(1000, horasAtras(20));
        await criaRelatorio(1100, horasAtras(1));
        await criaRelatorio(50000, horasAtras(1), new mongoose.Types.ObjectId());

        expect(await geraPnl(usuario)).toBe(100);
    });
});
