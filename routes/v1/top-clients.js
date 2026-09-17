const express = require('express');
const { logger } = require('../../utils');
const { TopClients } = require('../../models'); 

const router = express.Router();

/**
 * @openapi
 * /v1/top-clients:
 *   get:
 *     summary: Top clientes do dia
 *     description: Retorna o relatório diário com os clientes que mais ganharam (gainers) e mais perderam (loosers) em uma data
 *     parameters:
 *       - in: query
 *         name: data
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Dia do relatório no formato AAAA-MM-DD
 *         example: '2026-09-15'
 *     responses:
 *       200:
 *         description: Relatório encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TopClientsResponse'
 *       400:
 *         description: Parâmetro data não informado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *             example:
 *               sucesso: false
 *               erro: Parâmetro "data" é obrigatório.
 *       404:
 *         description: Nenhum relatório encontrado para a data informada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RelatorioNaoEncontrado'
 *       500:
 *         $ref: '#/components/responses/ErroInterno'
 *     tags:
 *       - relatórios
 */

router.get('/', async (req, res) => { 
    try {
        const { data } = req.query;

        if (!data) {
            return res.status(400).json({ 
                sucesso: false,
                erro: 'Parâmetro "data" é obrigatório.' 
            });
        }

        const relatorio = await TopClients.findOne({ dia: data });

        if (!relatorio) {
            return res.status(404).json({ 
                sucesso: false,
                mensagem: 'Nenhum relatório encontrado para essa data.' 
            });
        }

        res.json({
            sucesso: true,
            relatorio: {
                dia: relatorio.dia,
                gainers: relatorio.gainers,
                loosers: relatorio.loosers
            }
        });

    } catch (e) {
        logger.error(`Erro na rota top-clients: ${e.message}`);

        res.status(500).json({
            sucesso: false,
            erro: e.message,
        });
    }
});

module.exports = router;