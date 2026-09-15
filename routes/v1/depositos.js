const express = require('express');

const { checaSaldo } = require('../../services');
const { logger } = require('../../utils');

const router = express.Router();


/**
 * @openapi
 * /v1/depositos:
 *   get:
 *     description: Retorna o histórico de depósitos realizados pelo usuário autenticado
 *     security:
 *       - auth: []
 *     responses:
 *       200:
 *         description: Lista de depósitos recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 depositos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       valor:
 *                         type: number
 *                         example: 250.00
 *                       data:
 *                         type: string
 *                         format: date-time
 *                         example: '2026-09-15T03:40:00.000Z'
 *                       cancelado:
 *                         type: boolean
 *                         example: false
 *     tags:
 *       - operações
 */


router.get('/', (req, res) => {
    res.json({
        sucesso: true,
        depositos: req.user.depositos,
    });
});


/**
 * @openapi
 * /v1/depositos:
 *   post:
 *     description: Realiza a solicitação de um novo depósito em BRL adicionando ao saldo do usuário
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Informações necessárias para efetuar o depósito
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
 *                 description: Quantia em dinheiro a ser depositada
 *                 example: 500.00
 *     responses:
 *       200:
 *         description: Depósito efetuado com sucesso e saldo atualizado
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
 *                   example: 1750.50
 *                 depositos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       valor:
 *                         type: number
 *                         example: 500.00
 *                       data:
 *                         type: string
 *                         format: date-time
 *                         example: '2026-09-15T03:41:00.000Z'
 *                       cancelado:
 *                         type: boolean
 *                         example: false
 *       422:
 *         description: Erro interno ou falha no processamento do depósito
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
 *                   example: Erro ao salvar informações do depósito
 *     tags:
 *       - operações
 */


router.post('/', async(req, res) => {
    const usuario = req.user;

    try{
        const valor = req.body.valor;
        usuario.depositos.push({ valor: valor, data: new Date(), cancelado: false, });
        await usuario.save();

        const saldoEmMoedas = usuario.moedas.find(m => m.codigo === 'BRL');
        if(saldoEmMoedas) {
            saldoEmMoedas.quantidade += valor; 
        } else {
            usuario.moedas.push({ codigo: 'BRL', quantidade: valor});
        }

        await usuario.save();

        res.json({
            sucesso: true,
            saldo: await checaSaldo(usuario),
            depositos: usuario.depositos,
        
        });
    } catch (e) {
        logger.error(`Erro no deposito: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
     
});


/**
 * @openapi
 * /v1/depositos/{id}/cancelar:
 *   patch:
 *     description: Cancela um depósito específico que ainda não tenha sido cancelado
 *     security:
 *       - auth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID identificador do depósito do banco de dados (ObjectId)
 *         example: '6342f000a1e60a140b49e5a3'
 *     responses:
 *       200:
 *         description: Depósito cancelado com sucesso e saldo recalculado
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
 *                 depositos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       valor:
 *                         type: number
 *                         example: 500.00
 *                       data:
 *                         type: string
 *                         format: date-time
 *                         example: '2026-09-15T03:41:00.000Z'
 *                       cancelado:
 *                         type: boolean
 *                         example: true
 *       404:
 *         description: Depósito informado não foi localizado na conta do usuário
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
 *                   example: Deposito nao encontrado
 *       422:
 *         description: Falha na validação de negócio (ex. Depósito já cancelado anteriormente)
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
 *                   example: Deposito ja cancelado
 *     tags:
 *       - operações
 */


//atividade

router.patch('/:id/cancelar', async (req, res) => {
    const usuario = req.user;

    try {
        const deposito = usuario.depositos.id(req.params.id);

        if (!deposito) {
            return res.status(404).json({
                sucesso: false,
                erro: 'Deposito nao encontrado',
            });
        }

        if (deposito.cancelado) {
            return res.status(422).json({
                sucesso: false,
                erro: 'Deposito ja cancelado',
            });
        }

        deposito.cancelado = true;
        usuario.markModified('depositos');
        await usuario.save();

        res.json({
            sucesso: true,
            saldo: await checaSaldo(usuario),
            depositos: usuario.depositos,
        });
    } catch (e) {
        logger.error(`Erro no cancelamento do deposito: ${e.message}`);

        res.status(422).json({
            sucesso: false,
            erro: e.message,
        });
    }
});
//atividade

module.exports = router;
