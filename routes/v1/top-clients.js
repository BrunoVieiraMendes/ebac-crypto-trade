const express = require('express');
const { logger } = require('../../utils');
const { TopClients } = require('../../models'); 

const router = express.Router();

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