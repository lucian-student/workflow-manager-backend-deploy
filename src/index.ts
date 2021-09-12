import "dotenv/config";
import 'reflect-metadata';
import express, { Request } from 'express';
import { ApolloServer } from 'apollo-server-express';
import http from 'http';
import createSchema from './createSchema';
import { createConnection } from 'typeorm';
import refreshTokens from "./utils/refreshTokens";
import cookieParser from "cookie-parser";
import cors from 'cors';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import jwt from 'jsonwebtoken';
import subscribtionToken from "./utils/subscribtionToken";

const PORT = process.env.PORT;

type RequestData = Request & {
    cookies: any & {
        token: any
    }
}

async function main() {
    await createConnection({
        type: 'postgres',
        synchronize: true,
        logging: false,
        extra: {
            ssl: { rejectUnauthorized: false },
        },
        entities: ['./build/entity/*.*'],
        url: process.env.DATABASE_URL
    });

    const schema = await createSchema();
    const apollo = new ApolloServer({
        schema,
        context: ({ req, res, connection }) => {
            if (connection) {
                return {
                    req,
                    res,
                    user_id: connection.context.user_id
                }
            } else {
                return {
                    req,
                    res
                }
            }
        },
        /* subscriptions: '/subscriptions',*/
    });

    const app = express();
    app.use(cookieParser());
    const corsOptions = {
        origin: 'https://workflow-manager-frontend-deploy.vercel.app',
        credentials: true
    }
    app.use(cors(corsOptions));

    // add route for token for subscribtions¨ /refresh_token/subscribtion
    // subscribtion token expiration 7days
    //change refresh_token route to /refresh_token/api
    app.post("/refresh_token/api", async (req: RequestData, res) => {
        await refreshTokens(req, res);
    });

    app.post("/refresh_token/subscribtion", async (req: RequestData, res) => {
        await subscribtionToken(req, res);
    });

    //apollo.installSubscriptionHandlers(httpServer)
    apollo.applyMiddleware({ app, cors: false });
    const httpServer = http.createServer(app);
    //apollo.installSubscriptionHandlers(httpServer);

    // httpServer.listen(PORT, () => { console.log(`server is listening on port ${PORT}/graphql`) });

    httpServer.listen(PORT, () => {
        new SubscriptionServer({
            execute,
            subscribe,
            schema: schema,
            onConnect: (connectionParams: { subscribtionToken: string }) => {
                console.log(connectionParams);
                if (connectionParams.subscribtionToken) {
                    try {
                        jwt.verify(connectionParams.subscribtionToken, process.env.SECRET3!);
                        return {
                            subscribtionToken: connectionParams.subscribtionToken
                        }
                    } catch (err) {
                        console.log(err.message);
                        return {
                            subscribtionToken: null
                        }
                    }
                } else {
                    return {
                        subscribtionToken: null,
                    }
                }
            }
        }, {
            server: httpServer,
            path: '/graphql',
        });

        console.log(`server is listening on port ${PORT}/graphql`)
    });
}


main();

