const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// valores fixos de teste: os unitarios nunca dependem do .env da maquina
process.env.JWT_SECRET_KEY = 'segredo-de-teste';
process.env.URL_DA_CRYPTOTRADE = 'http://localhost:3000';
process.env.COIN_MARKETCAP_URL = 'https://pro-api.coinmarketcap.com';
process.env.COIN_MARKETCAP_KEY = 'chave-de-teste';

let mongo = undefined;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    await mongoose.connect(uri);
});

afterAll(async () => {
    if (mongo) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongo.stop();
    }
});

afterEach(async () => {
    if (mongo) {
        const collections = mongoose.connection.collections;

        for (const modelo in collections) {
            const collection = collections[modelo];
            await collection.deleteMany();
        }
    }
});