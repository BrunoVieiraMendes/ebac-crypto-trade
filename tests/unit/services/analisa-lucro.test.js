const mongoose = require('mongoose');

const analisaLucroEmTrade = require('../../../services/analisa-lucro');
const { Relatorio } = require('../../../models');
const { LUCRO_PARA_PARABENIZAR } = require('../../../constants');

const usuario = { _id: new mongoose.Types.ObjectId() };

const criaRelatorio = (saldo, data, usuarioId = usuario._id) => Relatorio.create({ usuarioId, saldo, data: new Date(data) });

describe('se o usuário não tiver dois relatórios', () => {
    test('ele devolve lucro zero sem nenhum relatório', async () => {
        expect(await analisaLucroEmTrade(usuario)).toEqual({ lucro: 0, teveLucro: false });
    });

    test('ele devolve lucro zero com apenas um relatório', async () => {
        await criaRelatorio(5000, '2026-09-29');

        expect(await analisaLucroEmTrade(usuario)).toEqual({ lucro: 0, teveLucro: false });
    });
});

describe('se o usuário tiver dois ou mais relatórios', () => {
    test('ele compara apenas os dois mais recentes', async () => {
        await criaRelatorio(100, '2026-09-27');
        await criaRelatorio(3000, '2026-09-29');
        await criaRelatorio(1000, '2026-09-28');

        expect((await analisaLucroEmTrade(usuario)).lucro).toBe(2000);
    });

    test('ele indica lucro quando passa do mínimo para parabenizar', async () => {
        await criaRelatorio(1000, '2026-09-28');
        await criaRelatorio(1000 + LUCRO_PARA_PARABENIZAR + 1, '2026-09-29');

        expect((await analisaLucroEmTrade(usuario)).teveLucro).toBe(true);
    });

    test('ele não indica lucro quando fica exatamente no mínimo', async () => {
        await criaRelatorio(1000, '2026-09-28');
        await criaRelatorio(1000 + LUCRO_PARA_PARABENIZAR, '2026-09-29');

        expect((await analisaLucroEmTrade(usuario)).teveLucro).toBe(false);
    });

    test('ele devolve lucro negativo quando o usuário perdeu dinheiro', async () => {
        await criaRelatorio(5000, '2026-09-28');
        await criaRelatorio(3000, '2026-09-29');

        expect(await analisaLucroEmTrade(usuario)).toEqual({ lucro: -2000, teveLucro: false });
    });

    test('ele aceita um lucro mínimo diferente', async () => {
        await criaRelatorio(1000, '2026-09-28');
        await criaRelatorio(1200, '2026-09-29');

        expect((await analisaLucroEmTrade(usuario, 100)).teveLucro).toBe(true);
    });

    test('ele ignora os relatórios de outros usuários', async () => {
        await criaRelatorio(1000, '2026-09-28');
        await criaRelatorio(1500, '2026-09-29');
        await criaRelatorio(999999, '2026-09-30', new mongoose.Types.ObjectId());

        expect((await analisaLucroEmTrade(usuario)).lucro).toBe(500);
    });
});
