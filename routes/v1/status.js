const express = require('express');

const router = express.Router();

/**
 * @openapi
 * /v1/status:
 *   get:
 *     summary: Checagem de status
 *     description: Rota de checagem de status da API
 *     responses:
 *       200:
 *         description: A API está funcional e está tudo certinho! Aproveite!
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 *     tags:
 *       - status
 */


router.get('/', (_req, res) => {
  res.json({
    sucesso: true,
    status: 'ok',
  });
});

module.exports = router;
