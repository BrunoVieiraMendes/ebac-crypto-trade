const { cpf } = require('cpf-cnpj-validator');

const { enviaEmailDeParabenizacao } = require('../../../services/envia-email');
const parabenizacaoWorker = require('../../../workers/parabenizacao');
const { Usuario, Relatorio } = require('../../../models');
const { LUCRO_PARA_PARABENIZAR } = require('../../../constants');

// nao queremos mandar e-mail de verdade nos testes
jest.mock('../../../services/envia-email');

const job = { attemptsMade: 0, opts: { attempts: 3 } };

const criaUsuarioComLucro = async (indice, lucro, confirmado = true) => {
    const usuario = await Usuario.create({
        email: `usuario${indice}@ebac.com.br`,
        senha: 'senha-criptografada',
        cpf: cpf.generate(true),
        nome: `Usuário ${indice}`,
        confirmado,
    });

    await Relatorio.create([
        { usuarioId: usuario._id, saldo: 10000, data: new Date('2026-09-28') },
        { usuarioId: usuario._id, saldo: 10000 + lucro, data: new Date('2026-09-29') },
    ]);

    return usuario;
};

const emailsEnviadosPara = () => enviaEmailDeParabenizacao.mock.calls.map(([usuario]) => usuario.email);

describe('se o usuário lucrou mais que o mínimo', () => {
    test('ele envia o e-mail de parabéns com o lucro', async () => {
        const usuario = await criaUsuarioComLucro(1, LUCRO_PARA_PARABENIZAR + 500);
        const done = jest.fn();

        await parabenizacaoWorker(job, done);

        expect(done).toHaveBeenCalledWith();
        expect(enviaEmailDeParabenizacao).toHaveBeenCalledTimes(1);

        const [usuarioDoEmail, lucro] = enviaEmailDeParabenizacao.mock.calls[0];
        expect(usuarioDoEmail._id).toEqual(usuario._id);
        expect(lucro).toBe(LUCRO_PARA_PARABENIZAR + 500);
    });
});

describe('se o usuário não lucrou o suficiente', () => {
    test('ele não envia e-mail', async () => {
        await criaUsuarioComLucro(1, LUCRO_PARA_PARABENIZAR);
        await criaUsuarioComLucro(2, -300);
        const done = jest.fn();

        await parabenizacaoWorker(job, done);

        expect(done).toHaveBeenCalledWith();
        expect(enviaEmailDeParabenizacao).not.toHaveBeenCalled();
    });
});

describe('se o usuário não confirmou a conta', () => {
    test('ele não envia e-mail mesmo com lucro', async () => {
        await criaUsuarioComLucro(1, LUCRO_PARA_PARABENIZAR + 500, false);
        const done = jest.fn();

        await parabenizacaoWorker(job, done);

        expect(enviaEmailDeParabenizacao).not.toHaveBeenCalled();
    });
});

describe('se o envio de um e-mail falhar', () => {
    test('ele continua enviando para os outros usuários', async () => {
        await criaUsuarioComLucro(1, LUCRO_PARA_PARABENIZAR + 100);
        await criaUsuarioComLucro(2, LUCRO_PARA_PARABENIZAR + 200);
        enviaEmailDeParabenizacao
            .mockRejectedValueOnce(new Error('SMTP fora do ar'))
            .mockResolvedValueOnce();
        const done = jest.fn();

        await parabenizacaoWorker(job, done);

        expect(done).toHaveBeenCalledWith();
        expect(enviaEmailDeParabenizacao).toHaveBeenCalledTimes(2);
    });
});

describe('se houver mais usuários que o tamanho da página', () => {
    test('ele analisa todos os usuários', async () => {
        for (let i = 0; i < 12; i++) {
            await criaUsuarioComLucro(i, LUCRO_PARA_PARABENIZAR + 1);
        }
        const done = jest.fn();

        await parabenizacaoWorker(job, done);

        expect(new Set(emailsEnviadosPara()).size).toBe(12);
    });
});
