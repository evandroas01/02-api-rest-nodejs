"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRoutes = void 0;
const zod_1 = require("zod");
const node_crypto_1 = __importStar(require("node:crypto"));
const database_1 = require("../src/database");
const check_session_id_exists_1 = require("../src/middlewares/check-session-id-exists");
async function transactionRoutes(app) {
    app.addHook('preHandler', async (request, reply) => {
        console.log(`[${request.method}] ${request.url}`);
    });
    app.get('/', {
        preHandler: [check_session_id_exists_1.checkSessionIdExists],
    }, async (request, reply) => {
        const { sessionId } = request.cookies;
        const transactions = await (0, database_1.knex)('transactions')
            .where('session_id', sessionId)
            .select();
        return { transactions };
    });
    app.get('/:id', {
        preHandler: [check_session_id_exists_1.checkSessionIdExists],
    }, async (request) => {
        const getTransactionsParamsSchema = zod_1.z.object({
            id: zod_1.z.string().uuid(),
        });
        const { sessionId } = request.cookies;
        const { id } = getTransactionsParamsSchema.parse(request.params);
        const transaction = await (0, database_1.knex)('transactions')
            .where({
            session_id: sessionId,
            id,
        })
            .first();
        return { transaction };
    });
    app.get('/summary', {
        preHandler: [check_session_id_exists_1.checkSessionIdExists],
    }, async (request) => {
        const { sessionId } = request.cookies;
        const summary = await (0, database_1.knex)('transactions')
            .where('session_id', sessionId)
            .sum('amount', { as: 'amount' })
            .first();
        return { summary };
    });
    app.post('/', async (request, reply) => {
        const createTransactionBodySchema = zod_1.z.object({
            title: (0, zod_1.string)(),
            amount: zod_1.z.number(),
            type: zod_1.z.enum(['credit', 'debit']),
        });
        const { title, amount, type } = createTransactionBodySchema.parse(request.body);
        let sessionId = request.cookies.sessionId;
        if (!sessionId) {
            sessionId = (0, node_crypto_1.randomUUID)();
            reply.cookie('sessionId', sessionId, {
                path: '/',
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            });
        }
        await (0, database_1.knex)('transactions').insert({
            id: node_crypto_1.default.randomUUID(),
            title,
            amount: type === 'credit' ? amount : amount * -1,
            session_id: sessionId,
        });
        return reply.status(201).send();
    });
}
exports.transactionRoutes = transactionRoutes;
