const express = require('express');

const { geraPnl } = require('../../services');
const { logger } = require('../../utils');

const router = express.Router();

/**
 * @openapi
 * /v1/relatorios/pnl:
 *   get:
 *     summary: PNL do usuário
 *     description: Retorna o lucro ou prejuízo (PNL) do usuário nas últimas 24 horas, calculado a partir dos dois relatórios de saldo mais recentes
 *     security:
 *       - auth: []
 *     responses:
 *       200:
 *         description: PNL calculado com sucesso (valor negativo indica prejuízo)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PnlResponse'
 *       401:
 *         $ref: '#/components/responses/NaoAutorizado'
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 *     tags:
 *       - relatórios
 */

router.get('/pnl', async(req, res) => {
    try{
        const pnl = await geraPnl(req.user);

        res.json({
            sucesso: true,
            pnl: pnl,
        });
    } catch (e) {
        logger.error(`Erro na geração de relatorios ${e.message}`);

        res.status(500).json({
            sucesso: false,
            erro: e.message,
        });
    }
});

module.exports = router;