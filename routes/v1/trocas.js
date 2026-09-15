const express = require('express');

const { trocaMoedas } = require('../../services');
const { logger } = require('../../utils');

const router = express.Router();


/**
 * @openapi
 * /v1/trocas:
 *   post:
 *     description: Realiza a troca (compra ou venda) de uma criptomoeda com base em uma cotação ativa
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Dados necessários para executar a operação de troca
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cotacaoId
 *               - quantidade
 *               - operacao
 *             properties:
 *               cotacaoId:
 *                 type: string
 *                 description: ID único da cotação obtida previamente no sistema
 *                 example: '6342f000a1e60a140b49e5a3'
 *               quantidade:
 *                 type: number
 *                 description: Quantidade da moeda que se deseja operar
 *                 example: 0.5
 *               operacao:
 *                 type: string
 *                 enum: [COMPRA, VENDA]
 *                 description: Tipo da operação financeira a ser executada
 *                 example: 'COMPRA'
 *     responses:
 *       200:
 *         description: Troca realizada com sucesso. Retorna a carteira atualizada do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 moedas:
 *                   type: array
 *                   description: Lista com os saldos atualizados de todas as moedas do usuário
 *                   items:
 *                     type: object
 *                     properties:
 *                       codigo:
 *                         type: string
 *                         example: 'SOL'
 *                       quantidade:
 *                         type: number
 *                         example: 2.35
 *       422:
 *         description: Falha na regra de negócio (ex. Cotação expirada, saldo insuficiente ou operação inválida)
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
 *                   example: Saldo insuficiente para realizar a compra
 *     tags:
 *       - operações
 */


router.post('/', async(req, res) => {
    try {
        const moedas = await trocaMoedas(
            req.user,
            req.body.cotacaoId,
            req.body.quantidade,
            req.body.operacao
        );

        res.json({
            sucesso: true,
            moedas: moedas,
        });
    } catch (e) {
        logger.error(`Erro na troca de moedas: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});

module.exports = router;