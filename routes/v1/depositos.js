const express = require('express');

const { checaSaldo } = require('../../services');
const { logger } = require('../../utils');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        sucesso: true,
        depositos: req.user.depositos,
    });
});

router.post('/', async(req, res) => {
    const usuario = req.user;

    try{
        const valor = req.body.valor;
        usuario.depositos.push({ valor: valor, data: new Date(), cancelado: false, });
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
