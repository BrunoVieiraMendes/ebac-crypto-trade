const request = require('supertest');

const app = require('../../../app');

describe('GET /v1/docs', () => {
    test('ele retorna a página do Swagger', () => {
        return request(app)
            .get('/v1/docs/')
            .expect(200)
            .expect('Content-Type', /html/)
            .then(resposta => {
                expect(resposta.text).toContain('swagger-ui');
            });
    });
});

describe('rota inexistente', () => {
    test('ele retorna um 404 em JSON', () => {
        return request(app)
            .get('/v1/rota-que-nao-existe')
            .expect(404)
            .then(resposta => {
                expect(resposta.body).toEqual({ sucesso: false, erro: 'Not Found' });
            });
    });
});
