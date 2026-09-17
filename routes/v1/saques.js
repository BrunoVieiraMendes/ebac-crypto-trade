const express = require('express');

const { logger } = require('../../utils');
const { checaSaldo, sacaCrypto } = require('../../services');

const router = express.Router();

/**
 * @openapi
 * /v1/saques:
 *   get:
 *     summary: Lista os saques do usuário
 *     description: Retorna o histórico de saques em BRL realizados pelo usuário autenticado
 *     security:
 *       - auth: []
 *     responses:
 *       200:
 *         description: Lista de saques recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListaSaquesResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *     tags:
 *       - operações
 */


router.get('/', (req, res) => {
    res.json({
        sucesso: true,
        saques: req.user.saques,
    });
});


/**
 * @openapi
 * /v1/saques:
 *   post:
 *     summary: Realiza um saque em BRL
 *     description: Realiza a solicitação de um novo saque em BRL debitando do saldo do usuário
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Informações necessárias para efetuar o saque
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaqueRequest'
 *     responses:
 *       200:
 *         description: Saque efetuado com sucesso e saldo atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SaqueResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: Falha na regra de negócio ou na validação dos dados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               saldoInsuficiente:
 *                 summary: Saldo insuficiente
 *                 value:
 *                   sucesso: false
 *                   erro: Voce nao possui saldo para sacar esse dinheiro
 *               saldoEmReaisInsuficiente:
 *                 summary: Saldo em BRL insuficiente (o restante está em crypto)
 *                 value:
 *                   sucesso: false
 *                   erro: Voce nao possui saldo em reais para sacar esse dinheiro
 *               valorInvalido:
 *                 summary: Valor abaixo do mínimo permitido
 *                 value:
 *                   sucesso: false
 *                   erro: 'Usuario validation failed: saques.0.valor: Path `valor` (0) is less than minimum allowed value (1).'
 *     tags:
 *       - operações
 */

router.post('/', async(req, res) => {
    const usuario = req.user;

    try{
        const valor = req.body.valor;
        const saldo = await checaSaldo(usuario);

        if (saldo < valor) {
            throw new Error ('Voce nao possui saldo para sacar esse dinheiro');
        }

        const saldoEmMoedas = usuario.moedas.find(m => m.codigo === 'BRL');
        if (!saldoEmMoedas || saldoEmMoedas.quantidade < valor) {
            throw new Error ('Voce nao possui saldo em reais para sacar esse dinheiro');
        }

        usuario.saques.push({ valor: valor, data: new Date() });
        saldoEmMoedas.quantidade -= valor;

        await usuario.save();

        res.json({
            sucesso: true,
            saldo: saldo - valor,
            saques: usuario.saques,
        })
    } catch (e) {
        logger.error(`Erro no saque: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        })
    }
});

/**
 * @openapi
 * /v1/saques/{codigo}:
 *   post:
 *     summary: Realiza um saque de cryptomoeda
 *     description: Debita da carteira do usuário a quantidade informada da cryptomoeda indicada no path. A operação só é concluída se o usuário possuir a moeda com quantidade maior ou igual ao valor solicitado.
 *     security:
 *       - auth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         schema:
 *           type: string
 *           example: BTC
 *         required: true
 *         description: Código da moeda que você quer sacar (ex. BTC, ETH, BNB, XRP, ADA, SOL)
 *     requestBody:
 *       description: Quantidade da cryptomoeda a ser sacada
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaqueCryptoRequest'
 *     responses:
 *       200:
 *         description: Saque de crypto efetuado com sucesso. Retorna a carteira atualizada do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarteiraResponse'
 *             example:
 *               sucesso: true
 *               moedas:
 *                 - _id: '6342f1b2a1e60a140b49e5b6'
 *                   codigo: BRL
 *                   quantidade: 1500
 *                 - _id: '6342f1b2a1e60a140b49e5b7'
 *                   codigo: BTC
 *                   quantidade: 0.34
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: Não foi possível realizar o saque (moeda inexistente na carteira, saldo insuficiente ou valor inválido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               saldoInsuficiente:
 *                 summary: Saldo da moeda insuficiente
 *                 value:
 *                   sucesso: false
 *                   erro: Voce nao possui saldo para sacar esse valor!
 *               moedaNaoEncontrada:
 *                 summary: Usuário não possui a moeda informada
 *                 value:
 *                   sucesso: false
 *                   erro: Voce nao possui saldo para sacar esse valor!
 *               valorInvalido:
 *                 summary: Valor não informado, zero ou negativo
 *                 value:
 *                   sucesso: false
 *                   erro: Voce deve informar um valor maior que zero para sacar
 *     tags:
 *       - operações
 */


router.post('/:codigo', async(req, res) => {
    const usuario = req.user;
    const codigo = req.params.codigo;


    try {
        const valor = req.body.valor;
        const moedas = await sacaCrypto(usuario, codigo, valor);
        
        res.json({
            sucesso: true,
            moedas: moedas,
        });

    } catch (e) {
        logger.error(`Erro no saque de crypto: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});

module.exports = router;
