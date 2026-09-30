const request = require('supertest');
const jsonwebtoken = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../../../../app');
const { criaUsuario } = require('./usuario');

const geraJwt = (usuarioId) => {
    return jsonwebtoken.sign({ id: usuarioId }, process.env.JWT_SECRET_KEY);
};

// metodo: 'get', 'post', 'put', 'patch' ou 'delete'
const checaAutenticacao = (rota, metodo = 'get') => {
    describe('se o usuário não está logado', () => {
        test('ele recebe um 401', () => {
            return request(app)
                [metodo](rota)
                .expect(401);
        });

        test('ele informa o erro de autenticação', () => {
            return request(app)
                [metodo](rota)
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
                [metodo](rota)
                .set('Authorization', `Bearer ${jwt}`)
                .expect(401);
        });

        test('ele informa o erro de autenticação', () => {
            return request(app)
                [metodo](rota)
                .set('Authorization', `Bearer ${jwt}`)
                .then(resposta => {
                    expect(resposta.text).toBe('Unauthorized');
                });
        });
    });

    describe('se o JWT foi assinado com outro segredo', () => {
        test('ele retorna um 401', () => {
            const jwt = jsonwebtoken.sign({ id: new mongoose.Types.ObjectId().toString() }, 'segredo-falso');

            return request(app)
                [metodo](rota)
                .set('Authorization', `Bearer ${jwt}`)
                .expect(401);
        });
    });

    describe('se o usuário ainda não confirmou a conta', () => {
        test('ele retorna um 401', async () => {
            const usuario = await criaUsuario({ confirmado: false });

            return request(app)
                [metodo](rota)
                .set('Authorization', `Bearer ${geraJwt(usuario._id)}`)
                .expect(401);
        });
    });
};

module.exports = {
    geraJwt,
    checaAutenticacao,
}
