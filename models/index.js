const mongoose = require('mongoose');

const UsuarioSchema = require('./usuario');
const CotacaoSchema = require('./cotacao');
const CorretoraSchema = require('./corretora');
const RelatorioShema = require('./relatorio');
const TopClientsSchema = require('./top-clients');

const Usuario = mongoose.model('Usuario', UsuarioSchema);
const Cotacao = mongoose.model('Cotacao', CotacaoSchema);
const Corretora = mongoose.model('Corretora', CorretoraSchema);
const Relatorio = mongoose.model('Relatorio', RelatorioShema);
const TopClients = mongoose.model('TopClients', TopClientsSchema);

const connect = async () => {
  await mongoose.connect(process.env.MONGO_URL);
}

module.exports = {
  connect,
  Usuario,
  Cotacao,
  Corretora,
  Relatorio,
  TopClients,
}