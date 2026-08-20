const { Schema } = require('mongoose');

const clienteVariacaoSchema = new Schema({
    usuario: { 
        type: String, 
        required: true 
    },
    variacao: { 
        type: Number, 
        required: true 
    }
}, { _id: false }); 


const TopClientsSchema = new Schema({
    dia: { 
        type: String, 
        required: true 
    }, 
    gainers: [clienteVariacaoSchema],
    loosers: [clienteVariacaoSchema]
});

module.exports = TopClientsSchema;