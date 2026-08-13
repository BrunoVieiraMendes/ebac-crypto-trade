require('dotenv').config();

const { Corretora, connect } = require('./models');
const { mongoose } = require('mongoose');
const { CNPJ, RESERVA_MINIMA } = require('./constants');

(async () => {
    await connect();

    await Corretora.findOneAndUpdate({
        cnpj: CNPJ,
    }, {
        caixa: RESERVA_MINIMA,
    }, {
        upsert: true,
    });

    await mongoose.disconnect();
})();