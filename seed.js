require('dotenv').config();
const bcrypt = require('bcrypt');
// pode remover o top clients por qualquer outro nome de model
// que você preferir
const { Corretora, connect, Usuario, TopClients } = require('./models');
const { CNPJ, RESERVA_MINIMA } = require('./constants');
const { mongoose } = require('mongoose');

// popula base de dados
(async () => {
  await connect();

  await Corretora.findOneAndUpdate({
    cnpj: CNPJ,
  }, {
    caixa: RESERVA_MINIMA,
  }, {
    upsert: true,
  });


  // insere usuários
  const usuarioUm = await Usuario.findOneAndUpdate({
    cpf: '90925683094',
    email: 'juninho@ebac.com.br',
  }, {
    nome: 'Juninho da Silva Santos',
    senha: await bcrypt.hash('ebac1234', 10),
  }, {
    upsert: true,
    new: true // <--- ADICIONADO: Retorna o documento recém-criado em vez de null
  });

  const usuarioDois = await Usuario.findOneAndUpdate({
    cpf: '70200659022',
    email: 'mariazinha@ebac.com.br',
  }, {
    nome: 'Mariazinha da silva',
    senha: await bcrypt.hash('ebac1234', 10),
  }, {
    upsert: true,
    new: true // <--- ADICIONADO: Retorna o documento recém-criado em vez de null
  });

  const ontem = (new Date()).setDate((new Date()).getDate() - 1);
  const anteOntem = (new Date()).setDate((new Date()).getDate() - 2);
  const tresDiasAtras = (new Date()).setDate((new Date()).getDate() - 3);

  // insere ranking
  // ADICIONADO: Usando o ".id" para salvar como String no TopClients
  await TopClients.insertMany([
    { dia: ontem, gainers: [ { usuario: usuarioUm.id, variacao: 200 } ], loosers: [ { usuario: usuarioDois.id, variacao: -1300 }] },
    { dia: anteOntem, gainers: [ { usuario: usuarioDois.id, variacao: 2000 } ], loosers: [ { usuario: usuarioUm.id, variacao: -100 }] },
    { dia: tresDiasAtras, gainers: [ { usuario: usuarioDois.id, variacao: 100 } ], loosers: [ { usuario: usuarioUm.id, variacao: -2000 }] },
  ]);

  await mongoose.disconnect();
})();