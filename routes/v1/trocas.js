const express = require('express');

const { trocaMoedas } = require('../../services');
const { logger } = require('../../utils');

const router = express.Router();


/**
 * @openapi
 * /v1/trocas:
 *   post:
 *     summary: Troca (compra ou venda) de cryptomoeda
 *     description: Realiza a compra ou venda de uma cryptomoeda com base em uma cotação válida (obtida há no máximo 15 minutos em GET /v1/cotacoes). É cobrada uma taxa de 5% sobre a quantidade operada.
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Dados necessários para executar a operação de troca
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TrocaRequest'
 *     responses:
 *       200:
 *         description: Troca realizada com sucesso. Retorna a carteira atualizada do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarteiraResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: Falha na regra de negócio (cotação expirada, saldo insuficiente, falta de caixa da corretora ou dados faltando)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               dadosFaltando:
 *                 summary: Quantidade ou operação não informadas
 *                 value:
 *                   sucesso: false
 *                   erro: Voce deve informar a quantidade desejada e a operacao (compra ou venda) desejada
 *               operacaoInvalida:
 *                 summary: Operação diferente de compra ou venda
 *                 value:
 *                   sucesso: false
 *                   erro: Operacao invalida! Use compra ou venda
 *               quantidadeInvalida:
 *                 summary: Quantidade zero, negativa ou não numérica
 *                 value:
 *                   sucesso: false
 *                   erro: A quantidade deve ser um numero maior que zero
 *               cotacaoInvalida:
 *                 summary: Cotação inexistente ou expirada
 *                 value:
 *                   sucesso: false
 *                   erro: Cotacao invalida ou expirada!
 *               semCaixa:
 *                 summary: Corretora sem caixa para a operação
 *                 value:
 *                   sucesso: false
 *                   erro: Valor muito grande, nao temos caixa no momento para essa operacao
 *               saldoInsuficienteCompra:
 *                 summary: Saldo em BRL insuficiente para comprar
 *                 value:
 *                   sucesso: false
 *                   erro: Voce nao possui saldo o suficiente para essa operacao! deposite mais dinheiro
 *               saldoInsuficienteVenda:
 *                 summary: Saldo em crypto insuficiente para vender
 *                 value:
 *                   sucesso: false
 *                   erro: Voce nao possui saldo o suficiente para essa operacao! Compre mais cryptos!
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
