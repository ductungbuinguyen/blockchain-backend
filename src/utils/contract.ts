import { OrderStatus } from './../types/OrderStatus';
import { Order } from '../entities/Order';
import { Contract } from '../entities/Contract';
import {
	constants,
	Contract as EthersContract,
	providers,
	Wallet,
} from 'ethers';
import IEcommerceShop from '../ABIs/IEcommerceShop.json';
import IEShopFactory from '../ABIs/IEShopFactory.json';
import { User } from '../entities/User';
import { id, formatEther } from 'ethers/lib/utils';
import { ActivityHistory } from '../entities/ActivityHistory';
import { ActivityHistoryType } from '../types/ActivityHistoryType';
import { publishActivityHistory } from './pubsub';
import QRCode from 'qrcode';
import { MoreThan } from 'typeorm';
import crypto from 'crypto'

const provider = new providers.WebSocketProvider(
	process.env.BLOCKCHAIN_WS_PROVIDER ||
		'wss://ws-api.binance.com/ws-api/v3'
);

const jsonRpcProvider = new providers.JsonRpcProvider(process.env.JSON_RPC_PROVIDER || "https://data-seed-prebsc-2-s1.binance.org:8545/")

const wallet = new Wallet(
	process.env.WALLET_PRIVATE_KEY ||
		'71ef0e17f75ecb40b512b9f4aed33a5d6aba27649e50fecf0871b3fd35ae1a62',
		jsonRpcProvider
);

const eShopContractFactoryAddress =
	process.env.E_COMMERCE_SHOP_FACTORY_ADDRESS ||
	'0x0C6985C4C73d2365Acfc604a67bC522B7Ff6443D';

const eShopFactoryContract = new EthersContract(
	eShopContractFactoryAddress,
	IEShopFactory,
	provider
);

const eShopJsonRpcFactoryContract = new EthersContract(
	eShopContractFactoryAddress,
	IEShopFactory,
	jsonRpcProvider
);

const listenEventsBootstrap = async () => {
	const contracts = await Contract.find({
		relations: ['seller', 'seller.merchantMetaData'],
	});
	contracts.forEach((contract) => {
		initEventListenerForContract(contract);
	});
	eShopFactoryContract.on(
		{
			address: eShopContractFactoryAddress,
			topics: [id('ShopDeployed(address,address,address)')],
		},
		(...args: any) => {
			console.log('args', args);
			const event = args[args.length - 1];
			onShopDeployed(event);
		}
	);
	initBlocksSync()
};

const onShopDeployed = async (event: any) => {
	const { transactionHash, blockNumber } = event;
	const { shop, seller: sellerAddress } = event.args;
	const seller = await User.findOne({
		where: {
			metaMaskPublicKey: sellerAddress,
		},
	});
	console.log('seller', seller);
	if (!seller) return;
	const newContract = Contract.create({
		address: shop,
		seller,
	});
	const result = await newContract.save();
	console.log('result create new contract', result);
	initEventListenerForContract(result);
	const newActivity = await ActivityHistory.create({
		type: ActivityHistoryType.REGISTER_MERCHANT,
		targetContract: result,
		transactionHash,
		blockNumber,
	});
	const newActivityResult = await newActivity.save();
	console.log('newActivityResult', newActivityResult);
	publishActivityHistory({
		userIds: [seller.id],
		activityHistory: newActivityResult,
	});
};

const onOrderCreatedHandler = async (contract: Contract, event: any) => {
	const { transactionHash, blockNumber } = event;
	console.log("event", event)
	const { _id, _buyer, _price, _shipDeadline, _confirmDeadline, _orderTime, _name } =
		event.args;
	const	decentralizedId = _id.toString()
	const buyer = await User.findOne({
		where: {
			metaMaskPublicKey: _buyer,
		},
	});
	console.log("orderBuyer", buyer)
	if (!buyer) return;
	const price = formatEther(_price)
	const base64QrCode = await new Promise((resolve, reject) => {
		const qrCodeData = {
			contractAddress: contract.address,
			amount: price,
			orderDecentralizedId: decentralizedId,
		}
		QRCode.toDataURL(JSON.stringify(qrCodeData), function (err, code) {
			if (err) {
				reject(reject);
				return;
			}
			resolve(code);
		});
	}) as string;

	console.log("base64QrCode", base64QrCode)

	const order = Order.create({
		buyer,
		price,
		contract,
		confirmDeadline: Number(_confirmDeadline),
		shipDeadline: Number(_shipDeadline),
		decentralizedId,
		status: OrderStatus.CREATED,
		orderTime: Number(_orderTime),
		base64QrCode,
		name: _name,
	});
	const result = await order.save();
	console.log("result createOrder DB", result);
	const newActivity = await ActivityHistory.create({
		type: ActivityHistoryType.CREATE_ORDER,
		targetOrder: result,
		transactionHash,
		blockNumber
	});
	const newActivityResult = await newActivity.save();
	console.log("newActivityResult", newActivityResult)
	publishActivityHistory({
		userIds: [contract.seller.id, buyer.id],
		activityHistory: newActivityResult,
	});
};

const onPaidHandler = async (contract: Contract, event: any) => {
	const { transactionHash, blockNumber } = event;
	const { _id } = event.args;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id.toString(),
		},
		relations: ["buyer"]
	});
	if (order) {
		order.status = OrderStatus.PAID;
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.PAY_ORDER,
			targetOrder: result,
			transactionHash,
			blockNumber,
		});
		const newActivityResult = await newActivity.save();
		publishActivityHistory({
			userIds: [order.buyer.id, contract.seller.id],
			activityHistory: newActivityResult,
		});
	}
};

const onShippingHandler = async (contract: Contract, event: any) => {
	const { _id } = event.args;
	const { transactionHash, blockNumber } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id.toString(),
		},
		relations: ['buyer'],
	});
	if (order) {
		order.status = OrderStatus.SHIPPING;
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.PAY_ORDER,
			targetOrder: result,
			transactionHash,
			blockNumber,
		});
		const newActivityResult = await newActivity.save();
		publishActivityHistory({
			userIds: [order.buyer.id, contract.seller.id],
			activityHistory: newActivityResult,
		});
	}
};

const onSellerConfirmShippedHandler = async (contract: Contract, event: any) => {
	const { _id } = event.args;
	const { transactionHash, blockNumber } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id.toString(),
		},
		relations: ['buyer'],
	});
	if (order) {
		order.isSellerConfirm = true
		const result = await order.save();
		console.log("seller confirm createorder result", result)
		const newActivity = await ActivityHistory.create({
			targetOrder: result,
			transactionHash,
			blockNumber,
		});
		const newActivityResult = await newActivity.save();
		publishActivityHistory({
			userIds: [order.buyer.id, contract.seller.id],
			activityHistory: newActivityResult,
		});
	}
};

const onBuyerConfirmShippedHandler = async (contract: Contract, event: any) => {
	const { _id } = event.args;
	const { transactionHash, blockNumber } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id.toString(),
		},
		relations: ['buyer'],
	});
	if (order) {
		order.isBuyerConfirm = true
		order.status = OrderStatus.COMPLETE;
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.ORDER_COMPLETED,
			targetOrder: result,
			transactionHash,
			blockNumber,
		});
		const newActivityResult = await newActivity.save();
		publishActivityHistory({
			userIds: [order.buyer.id, contract.seller.id],
			activityHistory: newActivityResult,
		});
	}
};

const onTimeoutHandler = async (contract: Contract, event: any) => {
	const { _id } = event.args;
	const { transactionHash, blockNumber } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id.toString(),
		},
	});
	if (order) {
		order.status = OrderStatus.CANCELED;
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.TIME_OUT_ORDER,
			targetOrder: result,
			transactionHash,
			blockNumber,
		});
		const newActivityResult = await newActivity.save();
		publishActivityHistory({
			userIds: [order.buyer.id, contract.seller.id],
			activityHistory: newActivityResult,
		});
	}
};

// const onCompleteHandler = async (contract: Contract, event: any) => {
// 	const { _id } = event.args;
// 	const { transactionHash } = event;
// 	const order = await Order.findOne({
// 		where: {
// 			decentralizedId: _id,
// 		},
// 		relations: ['buyer'],
// 	});
// 	if (order) {
// 		order.status = OrderStatus.COMPLETE;
// 		const result = await order.save();
// 		const newActivity = await ActivityHistory.create({
// 			type: ActivityHistoryType.ORDER_COMPLETED,
// 			targetOrder: result,
// 			transactionHash,
// 		});
// 		const newActivityResult = await newActivity.save();
// 		publishActivityHistory({
// 			userIds: [contract.seller.id, order.buyer.id],
// 			activityHistory: newActivityResult,
// 		});
// 	}
// };

const contractEvents = [
	{
		id: 'orderCreated',
		topics: [
			id('OrderCreated(uint256,address,string,uint256,uint256,uint256,uint256)'),
		],
		handlerFunction: onOrderCreatedHandler,
	},
	{
		id: 'paid',
		topics: [id('Paid(uint256,address)')],
		handlerFunction: onPaidHandler,
	},
	{
		id: 'shipping',
		topics: [id('Shipping(uint256)')],
		handlerFunction: onShippingHandler,
	},
	{
		id: 'sellerConfirmOrderShipped',
		topics: [id('SellerComplete(uint256,address)')],
		handlerFunction: onSellerConfirmShippedHandler,
	},
	{
		id: 'buyerConfirmOrderShipped',
		topics: [id('BuyerComplete(uint256,address)')],
		handlerFunction: onBuyerConfirmShippedHandler,
	},
	{
		id: 'timeout',
		topics: [id('Timeout(uint256)')],
		handlerFunction: onTimeoutHandler,
	},
];

const initBlocksSync = async () => {
	console.log('initBlocksSync')
	let blockNumber = await jsonRpcProvider.getBlockNumber()
	let eventFilter = eShopFactoryContract.filters.ShopDeployed()
	setInterval(async () => {
		const newTransactionHashes = (await ActivityHistory.getRepository().find({
			where: {
				blockNumber: MoreThan(blockNumber)
			},
			select: ["transactionHash"]
		})).map(event => event.transactionHash)
		const currentBlockNumber = await jsonRpcProvider.getBlockNumber()
		const events = await eShopJsonRpcFactoryContract.queryFilter(eventFilter, blockNumber, currentBlockNumber)
		console.log("events", events)
		console.log("eshop deployed events", events)
		if(events.length > 0) {
			const missedEvents = events.filter(event => !newTransactionHashes.includes(event.transactionHash))
			missedEvents.forEach(event => onShopDeployed(event))
		}
		const contracts = await Contract.find({
			relations: ['seller'],
		});
		contracts.forEach(contract => {
			const { address } = contract;
			const etherContract = new EthersContract(address, IEcommerceShop, jsonRpcProvider);
			contractEvents.forEach(async (contractEvent) => {
				const events = await etherContract.queryFilter({
					address,
					topics: contractEvent.topics
				}, blockNumber, currentBlockNumber)
				if(events.length > 0) {
					const missedEvents = events.filter(event => !newTransactionHashes.includes(event.transactionHash))
					console.log("missedEvents", missedEvents)
					missedEvents.forEach(event => contractEvent.handlerFunction(contract, event))
				}
			})
		})
		blockNumber = currentBlockNumber
	}, 30000)
}

const initEventListenerForContract = async (contract: Contract) => {
	const { address } = contract;
	const etherContract = new EthersContract(address, IEcommerceShop, provider);
	contractEvents.forEach((contractEvent) => {
		etherContract.on(
			{
				address,
				topics: contractEvent.topics,
			},
			(...args: any) => {
				console.log('args', args);
				const event = args[args.length - 1];
				contractEvent.handlerFunction(contract, event);
			}
		);
	});
};

const createOrder = async ({
	contractAddress,
	buyerAddress,
	nonce,
	price,
	shipDeadline,
	signature,
	name
}: any) => {
	const etherContract = new EthersContract(
		contractAddress,
		IEcommerceShop,
		wallet
	);
	console.log("contractAddress", contractAddress)
	const systemFee = await etherContract.admin()
	console.log("systemFee", systemFee)
	console.log("buyerAddress", buyerAddress)
	const createOrderContractResult = await etherContract.createOrder([
		buyerAddress,
		BigInt(price),
		BigInt(shipDeadline),
		BigInt(nonce),
		name,
	], signature
	);
	console.log("createOrderContractResult", createOrderContractResult)
	return createOrderContractResult?.hash;
};

const getContractNonce = async (address: string) => {
	const etherContract = new EthersContract(address, IEcommerceShop, provider);
	const nonce = await etherContract.getNonce();
	if (typeof nonce === 'bigint') return Number(nonce);
	return nonce;
};

const getCurrentBlockTimestamp = async () => {
	return (await jsonRpcProvider.getBlock('latest'))?.timestamp;
};

const deployECommerceContract = async (merchantAddress: string) => {
	const etherContract = new EthersContract(
		eShopContractFactoryAddress,
		IEShopFactory,
		wallet
	);
	const result = await etherContract.deployEShop([
		merchantAddress,
		constants.AddressZero,
	]);
	console.log('result deploy eshop', result);
	return result;
};

const generateRandomKey = () => {
	let result = '';
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < 32) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
};

const generatePublicApiSignature = ({
	body,
	secretKey,
}: {
	body: string;
	secretKey: string;
}) => {
	const hmac = crypto.createHmac('sha256', secretKey);
  const data = hmac.update(body)
  const hexString = data.digest('hex')
	return hexString.toUpperCase()
}

export {
	listenEventsBootstrap,
	initEventListenerForContract,
	createOrder,
	getContractNonce,
	getCurrentBlockTimestamp,
	deployECommerceContract,
	generateRandomKey,
	generatePublicApiSignature,
};
