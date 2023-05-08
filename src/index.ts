require('dotenv').config();
import 'reflect-metadata';
import express, { json } from 'express';
import { createConnection } from 'typeorm';
import { User } from './entities/User';
import { createServer } from 'http';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import {
	ApolloServerPluginDrainHttpServer,
	ApolloServerPluginLandingPageGraphQLPlayground,
} from 'apollo-server-core';
import { UserResolver } from './resolvers/user';
import { Context } from './types/Context';
import refreshTokenRouter from './routes/refreshTokenRouter';
import informationForCreateOrderInput from './routes/informationForCreateOrderInput';
import createOrder from './routes/createOrder';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { Order } from './entities/Order';
import { Contract } from './entities/Contract';
import { MerchantMetaData } from './entities/MerchantMetaData';
import { listenEventsBootstrap } from './utils/contract';
import { ContractResolver } from './resolvers/contract';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import expressPlayground from 'graphql-playground-middleware-express';
import { pubsub } from './utils/pubsub';
import { getDynamicContextWebSocket } from './middleware/checkAuth';
import { ActivityHistory } from './entities/ActivityHistory';
import { ActivityHistoryResolver } from './resolvers/activityHistory';

const main = async () => {
	console.log('Starting')
	console.log('host', process.env.DB_HOST)
	console.log('host', process.env.DB_NAME)
	console.log('host', process.env.DB_USERNAME)
	console.log('host', process.env.DB_PASSWORD)
	const result = await createConnection({
		type: 'postgres',
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		port: Number(process.env.DB_PORT),
		logging: true,
		synchronize: true,
		entities: [User, Order, Contract, MerchantMetaData, ActivityHistory],
	});

	console.log("connect DB result", result)

	const app = express();
	const pubSub = pubsub;

	app.use(cors({ origin: ['http://192.168.1.9:3000', 'http://localhost:3000', 'https://localhost:3000', 'https://ea7e-171-252-155-13.ngrok-free.app'], credentials: true }));
	app.use(cookieParser());
	app.use(json({ limit: 99999999999 }))
	app.use('/refresh_token', refreshTokenRouter);
	app.use('/information_for_create_order_input', informationForCreateOrderInput);
	app.use('/create_order', createOrder);

	const httpServer = createServer(app);

	const schema = await buildSchema({
		validate: false,
		resolvers: [UserResolver, ContractResolver, ActivityHistoryResolver],
		nullableByDefault: true,
		pubSub,
	});

	const wsServer = new WebSocketServer({
		server: httpServer,
		path: '/graphql',
		maxPayload: 99999999999
	});

	const serverCleanup = useServer(
		{
			schema,
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
			context: getDynamicContextWebSocket,
		},
		wsServer
	);

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
	});

	await apolloServer.start();

	apolloServer.applyMiddleware({
		app,
		path: '/graphql',
		cors: { origin: ['http://192.168.1.9:3000', 'http://localhost:3000', 'https://localhost:3000', 'https://ea7e-171-252-155-13.ngrok-free.app'], credentials: true},
	});

	app.get(
		'/playground',
		expressPlayground({
			endpoint: '/graphql',
		})
	);

	const PORT = process.env.PORT || 4000;

	await new Promise((resolve) =>
		httpServer.listen({ port: PORT }, resolve as () => void)
	);

	console.log(
		`SERVER STARTED ON PORT ${PORT}. GRAPHQL ENDPOINT ON http://localhost:${PORT}${apolloServer.graphqlPath}`
	);

	await listenEventsBootstrap();
};

main().catch((error) => console.log('ERROR STARTING SERVER: ', error));
