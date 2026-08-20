const Queue = require('bull');

const cotacoesWorker = require('./cotacoes');
const fechamentoWorker = require('./fechamento')
const saldoWorker = require('./saldo')
const relatoriosWorker = require('./relatorios');

const cotacoesQueue = new Queue('busca-cotacoes', process.env.REDIS_URL);
const fechamentoQueue = new Queue('analise-diaria', process.env.REDIS_URL);
const aumentaSaldoQueue = new Queue('aumenta-saldo', process.env.REDIS_URL);
const relatoriosQueue = new Queue('relatorios', process.env.REDIS_URL);

cotacoesQueue.process(cotacoesWorker);
fechamentoQueue.process(fechamentoWorker);
aumentaSaldoQueue.process(saldoWorker);
relatoriosQueue.process(relatoriosWorker);

const agendaTarefas = async () => {
    const cotacoesAgendadas = await cotacoesQueue.getRepeatableJobs();
    for (const jobDeBusca of cotacoesAgendadas) {
        await cotacoesQueue.removeRepeatableByKey(jobDeBusca.key);
    }
    
    cotacoesQueue.add({},
         { 
            repeat: { cron: '0/1 * * * *'},
            attempts: 3,
            backoff: 5000,
        }
    );

    const fechamentosAgendados = await fechamentoQueue.getRepeatableJobs();
    for (const jobFechamento of fechamentosAgendados) {
        await fechamentoQueue.removeRepeatableByKey(jobFechamento.key);
    }

    // Agenda para rodar 1 vez por dia, às 23:59
    fechamentoQueue.add({}, { 
        repeat: { cron: '59 23 * * *'}, 
        attempts: 3,
        backoff: 5000,
    });

    aumentaSaldoQueue.add({},
        {
            repeat: { cron: '0 0 * * *' },
            attempts: 3,
            backoff: 5000,
        }
    );

    relatoriosQueue.add({},
        {
            repeat: { cron: '0 0 * * *' },
            attempts: 3,
            backoff: 5000,
        }
    );
};

module.exports = { agendaTarefas };