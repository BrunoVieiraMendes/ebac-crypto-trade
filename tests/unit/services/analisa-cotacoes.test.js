const analisaCotacoes = require('../../../services/analisa-cotacoes');

const cotacoesOntem = { BTC: 100, ETH: 100, BNB: 100, XRP: 100, ADA: 100, SOL: 100 };
const cotacoesHoje = { BTC: 110, ETH: 150, BNB: 95, XRP: 100, ADA: 80, SOL: 101 };

describe('se houver cotações de ontem e de hoje', () => {
    test('ele devolve o dia de referência', () => {
        expect(analisaCotacoes(cotacoesOntem, cotacoesHoje, '2026-09-29').dia).toBe('2026-09-29');
    });

    test('ele devolve as 3 moedas que mais subiram, da maior para a menor', () => {
        const { gainers } = analisaCotacoes(cotacoesOntem, cotacoesHoje, '2026-09-29');

        expect(gainers).toEqual([
            { moeda: 'ETH', variacao: 50 },
            { moeda: 'BTC', variacao: 10 },
            { moeda: 'SOL', variacao: 1 },
        ]);
    });

    test('ele devolve as 3 moedas que mais caíram, da maior queda para a menor', () => {
        const { loosers } = analisaCotacoes(cotacoesOntem, cotacoesHoje, '2026-09-29');

        expect(loosers).toEqual([
            { moeda: 'ADA', variacao: -20 },
            { moeda: 'BNB', variacao: -5 },
            { moeda: 'XRP', variacao: 0 },
        ]);
    });

    test('ele arredonda a variação em 2 casas decimais', () => {
        const { gainers } = analisaCotacoes({ BTC: 3 }, { BTC: 4 }, '2026-09-29');

        expect(gainers[0].variacao).toBe(33.33);
    });
});

describe('se uma moeda não tiver cotação ontem', () => {
    test('ele ignora a moeda', () => {
        const { gainers, loosers } = analisaCotacoes({ BTC: 100 }, { BTC: 120, ETH: 500 }, '2026-09-29');

        expect(gainers).toEqual([{ moeda: 'BTC', variacao: 20 }]);
        expect(loosers).toEqual([{ moeda: 'BTC', variacao: 20 }]);
    });
});

describe('se não houver cotações', () => {
    test('ele devolve as listas vazias', () => {
        expect(analisaCotacoes({}, {}, '2026-09-29')).toEqual({ dia: '2026-09-29', gainers: [], loosers: [] });
    });
});
