const express = require('express');

const { logger } = require('../../utils');
const { checaSaldo, sacaCrypto } = require('../../services');

const router = express.Router();

/**
 * @openapi
 * /v1/saques:
 *   get:
 *     description: Retorna o histórico de saques realizados pelo usuário autenticado
 *     security:
 *       - auth: []
 *     responses:
 *       200:
 *         description: Lista de saques recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 saques:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       valor:
 *                         type: number
 *                         example: 150.00
 *                       data:
 *                         type: string
 *                         format: date-time
 *                         example: '2026-09-15T03:33:00.000Z'
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
 *     description: Realiza a solicitação de um novo saque em BRL debitando do saldo do usuário
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Informações necessárias para efetuar o saque
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - valor
 *             properties:
 *               valor:
 *                 type: number
 *                 description: Quantia em dinheiro a ser sacada
 *                 example: 50.00
 *     responses:
 *       200:
 *         description: Saque efetuado com sucesso e saldo atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 saldo:
 *                   type: number
 *                   example: 1250.50
 *                 saques:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       valor:
 *                         type: number
 *                         example: 50.00
 *                       data:
 *                         type: string
 *                         format: date-time
 *                         example: '2026-09-15T03:33:05.000Z'
 *       422:
 *         description: Falha na validação do negócio (ex. Saldo insuficiente)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: false
 *                 erro:
 *                   type: string
 *                   example: Voce nao possui saldo para sacar esse dinheiro
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
        usuario.saques.push({ valor: valor, data: new Date() });

        const saldoEmMoedas = usuario.moedas.find(m => mcodigo === 'BRL');
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
 *     description: Realiza o saque de uma determinada cryptomoeda
 *     security:
 *       - auth: []
 *     parameters:
 *       - in: path
 *         name: codigo
 *         schema:
 *           type: string
 *           example: BTC
 *         required: true
 *         description: Código da moeda que você quer sacar
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