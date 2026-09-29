const { ehUrlDeRedirecionamentoValida } = require('../../../utils');

describe('se a url for absoluta com http ou https', () => {
    test('ele aceita a url', () => {
        expect(ehUrlDeRedirecionamentoValida('https://www.google.com.br')).toBe(true);
        expect(ehUrlDeRedirecionamentoValida('http://localhost:3000/bem-vindo?x=1')).toBe(true);
        expect(ehUrlDeRedirecionamentoValida('HTTPS://WWW.MEUSITE.COM.BR')).toBe(true);
    });

    test('ele aceita a url com espaços em volta', () => {
        expect(ehUrlDeRedirecionamentoValida('  https://www.google.com.br  ')).toBe(true);
    });
});

describe('se a url for relativa ou de outro protocolo', () => {
    test('ele recusa a url', () => {
        expect(ehUrlDeRedirecionamentoValida('/bem-vindo')).toBe(false);
        expect(ehUrlDeRedirecionamentoValida('www.google.com.br')).toBe(false);
        expect(ehUrlDeRedirecionamentoValida('javascript:alert(1)')).toBe(false);
        expect(ehUrlDeRedirecionamentoValida('ftp://arquivos.com.br')).toBe(false);
        expect(ehUrlDeRedirecionamentoValida('https://')).toBe(false);
    });

    test('ele recusa url com espaço no meio', () => {
        expect(ehUrlDeRedirecionamentoValida('https://www.google.com.br/ola mundo')).toBe(false);
    });
});

describe('se a url não for um texto', () => {
    test('ele recusa sem dar erro', () => {
        expect(ehUrlDeRedirecionamentoValida(undefined)).toBe(false);
        expect(ehUrlDeRedirecionamentoValida(null)).toBe(false);
        expect(ehUrlDeRedirecionamentoValida(123)).toBe(false);
        expect(ehUrlDeRedirecionamentoValida({ url: 'https://www.google.com.br' })).toBe(false);
    });
});
