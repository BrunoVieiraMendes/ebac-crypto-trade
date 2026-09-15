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
        },
        schemas: {
            'Cotação': {
                type: 'object',
                properties: {
                    moeda: {
                        type: 'string',
                        example: 'SOL'
                    },
                    data: {
                        type: 'string',
                        format: 'date-time',
                        example: '2022-10-09T16:00:00.398Z',
                    },
                    id: {
                        type: 'string',
                        example: '6342f000a1e60a140b49e5a3',
                    },
                    valor: {
                        type: 'number',
                        example: 171.81767394791615,
                    }
                }
            }
        }
    }
};


const opcoes = {
    definition: swaggerBase,
    apis: ['./routes/v1/*.js'],
};

module.exports = swaggerJSDoc(opcoes);
