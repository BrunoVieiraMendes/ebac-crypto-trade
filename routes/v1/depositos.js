const express = require('express');

const { checaSaldo } = require('../../services');
const { logger } = require('../../utils');

const router = express.Router();


/**
 * @openapi
 * /v1/depositos:
 *   get:
 *     summary: Lista os depósitos do usuário
 *     description: Retorna o histórico de depósitos realizados pelo usuário autenticado
 *     security:
 *       - auth: []
 *     responses:
 *       200:
 *         description: Lista de depósitos recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListaDepositosResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
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
 *     summary: Realiza um depósito em BRL
 *     description: Realiza a solicitação de um novo depósito em BRL adicionando ao saldo do usuário
 *     security:
 *       - auth: []
 *     requestBody:
 *       description: Informações necessárias para efetuar o depósito
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepositoRequest'
 *     responses:
 *       200:
 *         description: Depósito efetuado com sucesso e saldo atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepositoResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       422:
 *         description: Falha na validação ou no processamento do depósito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             examples:
 *               valorAbaixoDoMinimo:
 *                 summary: Valor abaixo do mínimo (100)
 *                 value:
 *                   sucesso: false
 *                   erro: 'Usuario validation failed: depositos.0.valor: Path `valor` (50) is less than minimum allowed value (100).'
 *               valorNaoInformado:
 *                 summary: Campo valor não enviado
 *                 value:
 *                   sucesso: false
 *                   erro: 'Usuario validation failed: depositos.0.valor: Path `valor` is required.'
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
 *     summary: Cancela um depósito
 *     description: Cancela um depósito específico que ainda não tenha sido cancelado
 *     security:
 *       - auth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do depósito (campo _id retornado na listagem de depósitos)
 *         example: '6342f2c3a1e60a140b49e5c9'
 *     responses:
 *       200:
 *         description: Depósito cancelado com sucesso e saldo recalculado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepositoResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       404:
 *         description: Depósito informado não foi localizado na conta do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example:
 *               sucesso: false
 *               erro: Deposito nao encontrado
 *       422:
 *         description: Falha na regra de negócio (ex. depósito já cancelado anteriormente)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example:
 *               sucesso: false
 *               erro: Deposito ja cancelado
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
