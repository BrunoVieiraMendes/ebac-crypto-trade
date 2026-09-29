const { generateSecret, generateSync } = require('otplib');

const { geraSegredo, validaOtp } = require('../../../services/otp');

describe('se um segredo for gerado', () => {
    test('ele devolve o segredo, a URI otpauth e o QR Code em SVG', () => {
        const { segredo, otpauth, qrcode } = geraSegredo('test@ebac.com.br');

        expect(segredo).toEqual(expect.any(String));
        expect(otpauth).toMatch(/^otpauth:\/\/totp\//);
        expect(otpauth).toContain(`secret=${segredo}`);
        expect(otpauth).toContain('issuer=CryptoTrade');
        expect(String(qrcode)).toContain('<svg');
    });

    test('ele gera um segredo diferente a cada chamada', () => {
        const primeiro = geraSegredo('test@ebac.com.br');
        const segundo = geraSegredo('test@ebac.com.br');

        expect(primeiro.segredo).not.toBe(segundo.segredo);
    });
});

describe('se o código do autenticador estiver correto', () => {
    test('ele valida o código', () => {
        const segredo = generateSecret();
        const codigo = generateSync({ secret: segredo });

        expect(validaOtp(segredo, codigo)).toBe(true);
    });

    test('ele aceita o código com espaços em volta', () => {
        const segredo = generateSecret();
        const codigo = generateSync({ secret: segredo });

        expect(validaOtp(segredo, ` ${codigo} `)).toBe(true);
    });
});

describe('se o código do autenticador estiver errado', () => {
    test('ele recusa um código de outro segredo', () => {
        const segredo = generateSecret();
        const codigoDeOutroSegredo = generateSync({ secret: generateSecret() });

        expect(validaOtp(segredo, codigoDeOutroSegredo)).toBe(false);
    });

    test('ele recusa um código com formato inválido', () => {
        const segredo = generateSecret();

        expect(validaOtp(segredo, 'abcdef')).toBe(false);
        expect(validaOtp(segredo, '123')).toBe(false);
    });
});

describe('se o segredo ou o código não forem informados', () => {
    test('ele recusa sem dar erro', () => {
        expect(validaOtp(undefined, '123456')).toBe(false);
        expect(validaOtp(generateSecret(), undefined)).toBe(false);
    });
});
