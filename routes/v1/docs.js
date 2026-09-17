const swaggerJSDoc = require('swagger-jsdoc');

// ---------------------------------------------------------------------------
// Modelos reutilizáveis (referenciados nas rotas via $ref)
// ---------------------------------------------------------------------------

const schemas = {
    // ------------------------------- Entidades -------------------------------
    Erro: {
        type: 'object',
        description: 'Formato padrão de retorno de falha da API',
        properties: {
            sucesso: {
                type: 'boolean',
                example: false,
            },
            erro: {
                type: 'string',
                description: 'Mensagem descrevendo o motivo da falha',
                example: 'Mensagem de erro',
            },
        },
    },
    Cotacao: {
        type: 'object',
        properties: {
            moeda: {
                type: 'string',
                example: 'SOL',
            },
            data: {
                type: 'string',
                format: 'date-time',
                example: '2022-10-09T16:00:00.398Z',
            },
            id: {
                type: 'string',
                description: 'ID da cotação, usado na troca de moedas',
                example: '6342f000a1e60a140b49e5a3',
            },
            valor: {
                type: 'number',
                description: 'Valor da moeda em BRL',
                example: 171.81767394791615,
            },
        },
    },
    Moeda: {
        type: 'object',
        description: 'Saldo de uma moeda na carteira do usuário',
        properties: {
            _id: {
                type: 'string',
                example: '6342f1b2a1e60a140b49e5b7',
            },
            codigo: {
                type: 'string',
                example: 'BTC',
            },
            quantidade: {
                type: 'number',
                example: 0.35,
            },
        },
    },
    Deposito: {
        type: 'object',
        properties: {
            _id: {
                type: 'string',
                description: 'ID do depósito (usado no cancelamento)',
                example: '6342f2c3a1e60a140b49e5c9',
            },
            valor: {
                type: 'number',
                minimum: 100,
                example: 500.0,
            },
            data: {
                type: 'string',
                format: 'date-time',
                example: '2026-09-15T03:41:00.000Z',
            },
            cancelado: {
                type: 'boolean',
                example: false,
            },
        },
    },
    Saque: {
        type: 'object',
        properties: {
            _id: {
                type: 'string',
                example: '6342f3d4a1e60a140b49e5d1',
            },
            valor: {
                type: 'number',
                minimum: 1,
                example: 50.0,
            },
            data: {
                type: 'string',
                format: 'date-time',
                example: '2026-09-15T03:33:05.000Z',
            },
        },
    },
    Usuario: {
        type: 'object',
        properties: {
            _id: {
                type: 'string',
                example: '6342ef90a1e60a140b49e591',
            },
            nome: {
                type: 'string',
                example: 'Bruno Vieira',
            },
            cpf: {
                type: 'string',
                example: '529.982.247-25',
            },
            email: {
                type: 'string',
                format: 'email',
                example: 'bruno@email.com',
            },
            confirmado: {
                type: 'boolean',
                description: 'Indica se o usuário já confirmou a conta pelo e-mail',
                example: true,
            },
            tokenDeConfirmacao: {
                type: 'string',
                description: 'Token enviado por e-mail. Deixa de existir após a confirmação',
                example: '9f1c2e7a4b...',
            },
            depositos: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Deposito',
                },
            },
            saques: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Saque',
                },
            },
            moedas: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Moeda',
                },
            },
        },
    },
    VariacaoCliente: {
        type: 'object',
        properties: {
            usuario: {
                type: 'string',
                example: 'bruno@email.com',
            },
            variacao: {
                type: 'number',
                description: 'Variação percentual do patrimônio no dia',
                example: 12.5,
            },
        },
    },
    RelatorioTopClients: {
        type: 'object',
        properties: {
            dia: {
                type: 'string',
                format: 'date',
                example: '2026-09-15',
            },
            gainers: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/VariacaoCliente',
                },
            },
            loosers: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/VariacaoCliente',
                },
            },
        },
    },

    // ------------------------------ Requisições ------------------------------
    LoginRequest: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                example: 'bruno@email.com',
            },
            senha: {
                type: 'string',
                format: 'password',
                example: 'minhaSenha123',
            },
        },
    },
    NovoUsuario: {
        type: 'object',
        required: ['nome', 'cpf', 'email', 'senha'],
        properties: {
            nome: {
                type: 'string',
                minLength: 4,
                example: 'Bruno Vieira',
            },
            cpf: {
                type: 'string',
                description: 'CPF válido',
                example: '529.982.247-25',
            },
            email: {
                type: 'string',
                format: 'email',
                example: 'bruno@email.com',
            },
            senha: {
                type: 'string',
                format: 'password',
                minLength: 5,
                example: 'minhaSenha123',
            },
        },
    },
    CriaUsuarioRequest: {
        type: 'object',
        required: ['usuario', 'redirect'],
        properties: {
            usuario: {
                $ref: '#/components/schemas/NovoUsuario',
            },
            redirect: {
                type: 'string',
                format: 'uri',
                description: 'URL para onde o usuário será redirecionado após confirmar a conta',
                example: 'https://www.meusite.com.br/bem-vindo',
            },
        },
    },
    DepositoRequest: {
        type: 'object',
        required: ['valor'],
        properties: {
            valor: {
                type: 'number',
                minimum: 100,
                description: 'Quantia em BRL a ser depositada (mínimo 100)',
                example: 500.0,
            },
        },
    },
    SaqueRequest: {
        type: 'object',
        required: ['valor'],
        properties: {
            valor: {
                type: 'number',
                minimum: 1,
                description: 'Quantia em BRL a ser sacada',
                example: 50.0,
            },
        },
    },
    SaqueCryptoRequest: {
        type: 'object',
        required: ['valor'],
        properties: {
            valor: {
                type: 'number',
                exclusiveMinimum: true,
                minimum: 0,
                description: 'Quantidade da cryptomoeda a ser sacada',
                example: 0.01,
            },
        },
    },
    TrocaRequest: {
        type: 'object',
        required: ['cotacaoId', 'quantidade', 'operacao'],
        properties: {
            cotacaoId: {
                type: 'string',
                description: 'ID de uma cotação obtida em GET /v1/cotacoes (válida por 15 minutos)',
                example: '6342f000a1e60a140b49e5a3',
            },
            quantidade: {
                type: 'number',
                description: 'Quantidade da cryptomoeda que se deseja operar',
                example: 0.5,
            },
            operacao: {
                type: 'string',
                enum: ['compra', 'venda'],
                description: 'Tipo da operação a ser executada',
                example: 'compra',
            },
        },
    },

    // ------------------------------- Respostas -------------------------------
    StatusResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            status: {
                type: 'string',
                example: 'ok',
            },
        },
    },
    LoginResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            jwt: {
                type: 'string',
                description: 'Token que deve ser enviado no header Authorization: Bearer <jwt>',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzNDJlZjkwIn0.abc123',
            },
        },
    },
    CriaUsuarioResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            usuario: {
                $ref: '#/components/schemas/Usuario',
            },
        },
    },
    PerfilResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            usuario: {
                $ref: '#/components/schemas/Usuario',
            },
            saldo: {
                type: 'number',
                description: 'Saldo total do usuário convertido para BRL',
                example: 1750.5,
            },
        },
    },
    CotacoesResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            cotacoes: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Cotacao',
                },
            },
        },
    },
    ListaDepositosResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            depositos: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Deposito',
                },
            },
        },
    },
    DepositoResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            saldo: {
                type: 'number',
                description: 'Saldo total do usuário convertido para BRL',
                example: 1750.5,
            },
            depositos: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Deposito',
                },
            },
        },
    },
    ListaSaquesResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            saques: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Saque',
                },
            },
        },
    },
    SaqueResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            saldo: {
                type: 'number',
                description: 'Saldo total restante convertido para BRL',
                example: 1250.5,
            },
            saques: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Saque',
                },
            },
        },
    },
    CarteiraResponse: {
        type: 'object',
        description: 'Carteira atualizada do usuário após uma operação',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            moedas: {
                type: 'array',
                items: {
                    $ref: '#/components/schemas/Moeda',
                },
            },
        },
    },
    TopClientsResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            relatorio: {
                $ref: '#/components/schemas/RelatorioTopClients',
            },
        },
    },
    PnlResponse: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: true,
            },
            pnl: {
                type: 'number',
                description: 'Lucro (positivo) ou prejuízo (negativo) em BRL nas últimas 24 horas',
                example: 152.37,
            },
        },
    },
    RelatorioNaoEncontrado: {
        type: 'object',
        properties: {
            sucesso: {
                type: 'boolean',
                example: false,
            },
            mensagem: {
                type: 'string',
                example: 'Nenhum relatório encontrado para essa data.',
            },
        },
    },
};

// Respostas comuns reutilizadas por várias rotas
const responses = {
    NaoAutorizado: {
        description: 'JWT ausente, inválido ou de um usuário não confirmado',
        content: {
            'text/plain': {
                schema: {
                    type: 'string',
                    example: 'Unauthorized',
                },
            },
        },
    },
    ErroInterno: {
        description: 'Erro inesperado no servidor',
        content: {
            'application/json': {
                schema: {
                    $ref: '#/components/schemas/Erro',
                },
            },
        },
    },
};

const swaggerBase = {
    openapi: '3.0.0',
    info: {
        title: 'API da CryptoTrade',
        description: 'Onde trocar cryptos é feito da forma mais fácil possível para voce desenvolvedor !!! :) ',
        version: '0.0.1',
    },
    tags: [
        { name: 'status', description: 'Saúde da API' },
        { name: 'autenticação', description: 'Login e confirmação de conta' },
        { name: 'usuário', description: 'Cadastro e perfil do usuário' },
        { name: 'operações', description: 'Cotações, depósitos, saques e trocas de moedas' },
        { name: 'relatórios', description: 'Relatórios gerados pela corretora' },
    ],
    components: {
        securitySchemes: {
            auth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas,
        responses,
    },
};

const opcoes = {
    failOnErrors: true,
    definition: swaggerBase,
    apis: ['./routes/v1/*.js'],
};

module.exports = swaggerJSDoc(opcoes);
