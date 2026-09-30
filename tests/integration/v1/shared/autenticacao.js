const request = require('supertest');
const jsonwebtoken = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../../../../app');

const geraJwt = (usuarioId) => {
    return jsonwebtoken.sign({ id: usuarioId }, process.env.JWT_SECRET_KEY);
};

const checaAutenticacao = (rota) => {
    describe('se o usuário não está logado', () => {
        test('ele recebe um 401', () => {
            return request(app)
                .get(rota)
                .expect(401);
        });

        test('ele informa o erro de autenticação', () => {
            return request(app)
                .get(rota)
                .then(resposta => {
                    expect(resposta.text).toBe('Unauthorized');
                });
        });
    });

    describe('se o usuario esta logado e nao existe', () => {
        // o _id do mongo e um ObjectId: um id valido que nao esta no banco
        const jwt = geraJwt(new mongoose.Types.ObjectId().toString());

        test('ele retorna um 401', () => {
            return request(app)
                .get(rota)
                .set('Authorization', `Bearer ${jwt}`)
                .expect(401);
        });

        test('ele informa o erro de autenticação', () => {
            return request(app)
                .get(rota)
                .set('Authorization', `Bearer ${jwt}`)
                .then(resposta => {
                    expect(resposta.text).toBe('Unauthorized');
                });
        });
    });

};

module.exports = {
    geraJwt,
    checaAutenticacao,
}
