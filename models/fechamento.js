const mongoose = require('mongoose');

const moedaVariacaoSchema = new mongoose.Schema({
    moeda: { type: String, required: true },
    variacao: { type: Number, required: true }
}, { _id: false }); // _id false para não gerar IDs automáticos dentro do array

const fechamentoDiarioSchema = new mongoose.Schema({
    dia: { type: String, required: true }, // Ex: '2022-08-10'
    gainers: [moedaVariacaoSchema],
    loosers: [moedaVariacaoSchema]
});

const FechamentoDiario = mongoose.model('FechamentoDiario', fechamentoDiarioSchema);

module.exports = FechamentoDiario;