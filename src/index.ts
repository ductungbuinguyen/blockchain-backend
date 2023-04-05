require('dotenv').config()
import 'reflect-metadata'
import express from 'express'
import { createConnection } from 'typeorm'
import { User } from './entities/User'
import { createServer } from 'http'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import {
	ApolloServerPluginDrainHttpServer,
	ApolloServerPluginLandingPageGraphQLPlayground
} from 'apollo-server-core'
import { UserResolver } from './resolvers/user'
import { Context } from './types/Context'
import refreshTokenRouter from './routes/refreshTokenRouter'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { Order } from './entities/Oder';
import { Contract } from './entities/Contract'
import { MerchantMetaData } from './entities/MerchantMetaData'
import { listenEventsBootstrap } from './utils/contract'
import { ContractResolver } from './resolvers/contract'
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import expressPlayground from "graphql-playground-middleware-express";
import { pubsub } from './utils/pubsub'
import { getDynamicContextWebSocket } from './middleware/checkAuth';

const main = async () => {
	await createConnection({
		type: 'postgres',
		database: 'blockchain-payment-dev',
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		logging: true,
		synchronize: true,
		entities: [User, Order, Contract, MerchantMetaData],
	})

	const app = express()
	const pubSub = pubsub

	app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
	app.use(cookieParser())

	app.use('/refresh_token', refreshTokenRouter)

	const httpServer = createServer(app)

	
	const schema = await buildSchema({
		validate: false,
		resolvers: [UserResolver, ContractResolver],
		nullableByDefault: true,
		pubSub
	})

	const wsServer = new WebSocketServer({
		server: httpServer,
		path: '/graphql',
	});

	const serverCleanup = useServer({ schema,
		onConnect: async () => {
      // Check authentication every time a client connects.
      console.log('connected');
    },
    onDisconnect() {
      console.log('Disconnected!');
    },
		onClose() {
			console.log('Closed!');
		},
		onComplete() {
			console.log('Complete!');
		},
		context: getDynamicContextWebSocket
 }, wsServer);

	const apolloServer = new ApolloServer({
		schema,
		plugins: [
			ApolloServerPluginDrainHttpServer({ httpServer }),
			ApolloServerPluginLandingPageGraphQLPlayground,
			{
				async serverWillStart() {
					return {
						async drainServer() {
							await serverCleanup.dispose();
						},
					};
				},
			},
		],
		context: ({ req, res }): Pick<Context, 'req' | 'res'> => ({ req, res }),
	})

	await apolloServer.start()

	apolloServer.applyMiddleware({
		app,
		path: '/graphql',
		cors: { origin: 'http://localhost:3000', credentials: true }
	})

	app.get("/playground", expressPlayground({
		endpoint: '/graphql',
	}));

	const PORT = process.env.PORT || 4000

	await new Promise(resolve =>
		httpServer.listen({ port: PORT }, resolve as () => void)
	)

	console.log(
		`SERVER STARTED ON PORT ${PORT}. GRAPHQL ENDPOINT ON http://localhost:${PORT}${apolloServer.graphqlPath}`	
	)

	await listenEventsBootstrap()
}

main().catch(error => console.log('ERROR STARTING SERVER: ', error))
