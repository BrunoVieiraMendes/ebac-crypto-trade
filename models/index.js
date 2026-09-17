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

// Versões antigas do schema tinham `unique: true` em moedas.codigo, o que criava
// um índice único na coleção inteira e impedia dois usuários de terem a mesma
// moeda (ex. BRL). Removemos esse índice caso ele ainda exista no banco.
const removeIndiceAntigoDeMoedas = async () => {
  try {
    await Usuario.collection.dropIndex('moedas.codigo_1');
  } catch (e) {
    // 26 = coleção não existe, 27 = índice não existe (já foi removido)
    if (e.code !== 26 && e.code !== 27) {
      throw e;
    }
  }
};

const connect = async () => {
  await mongoose.connect(process.env.MONGO_URL);
  await removeIndiceAntigoDeMoedas();
}

module.exports = {
  connect,
  Usuario,
  Cotacao,
  Corretora,
  Relatorio,
  TopClients,
}