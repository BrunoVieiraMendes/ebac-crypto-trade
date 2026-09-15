const swaggerJSDoc = require('swagger-jsdoc');

const swaggerBase = {
    failOnErrors: true,
    openapi: '3.0.0',
    info: {
        title: 'API da CryptoTrade',
        description: 'Onde trocar cryptos é feito da forma mais fácil possível para voce desenvolvedor !!! :) ',
        version: '0.0.1',
    },
    components: {
        securitySchemes: {
            auth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            }
        }
    }
};

const opcoes = {
    definition: swaggerBase,
    apis: ['./routes/v1/*.js'],
};

module.exports = swaggerJSDoc(opcoes);
