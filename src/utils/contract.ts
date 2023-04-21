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

const provider = new providers.WebSocketProvider(
	process.env.BLOCKCHAIN_WS_PROVIDER ||
		'wss://dex.binance.org/api/ws'
);

const wallet = new Wallet(
	process.env.WALLET_PRIVATE_KEY ||
		'71ef0e17f75ecb40b512b9f4aed33a5d6aba27649e50fecf0871b3fd35ae1a62',
	provider
);

const eShopContractFactoryAddress =
	process.env.E_COMMERCE_SHOP_FACTORY_ADDRESS ||
	'0xf5326e3eBc4CEEa311F7cD626b12bdD1sC94C4b1F';

const eShopFactoryContract = new EthersContract(
	eShopContractFactoryAddress,
	IEShopFactory,
	provider
);

const listenEventsBootstrap = async () => {
	const contracts = await Contract.find({
		relations: ['seller'],
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
};

const onShopDeployed = async (event: any) => {
	const { transactionHash } = event;
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
	});
	const newActivityResult = await newActivity.save();
	console.log('newActivityResult', newActivityResult);
	publishActivityHistory({
		userIds: [seller.id],
		activityHistory: newActivityResult,
	});
};

const onOrderCreatedHandler = async (contract: Contract, event: any) => {
	const { transactionHash } = event;
	console.log("event", event)
	const { _id, _buyer, _price, _shipDeadline, _confirmDeadline, _orderTime } =
		event.args;
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
			orderDecentralizedId: _id,
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
		decentralizedId: _id,
		status: OrderStatus.CREATED,
		orderTime: Number(_orderTime),
		base64QrCode
	});
	const result = await order.save();
	console.log("result createOrder DB", result);
	const newActivity = await ActivityHistory.create({
		type: ActivityHistoryType.CREATE_ORDER,
		targetOrder: result,
		transactionHash,
	});
	const newActivityResult = await newActivity.save();
	publishActivityHistory({
		userIds: [contract.seller.id, buyer.id],
		activityHistory: newActivityResult,
	});
};

const onPaidHandler = async (contract: Contract, event: any) => {
	const { transactionHash } = event;
	const { _id } = event.args;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
	});
	if (order) {
		order.status = OrderStatus.PAID;
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.PAY_ORDER,
			targetOrder: result,
			transactionHash,
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
	const { transactionHash } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
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
	const { transactionHash } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
		relations: ['buyer'],
	});
	if (order) {
		order.isSellerConfirm = true
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.SELLER_CONFIRM_ORDER_SHIPPED,
			targetOrder: result,
			transactionHash,
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
	const { transactionHash } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
		relations: ['buyer'],
	});
	if (order) {
		order.isBuyerConfirm = true
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.BUYER_CONFIRM_ORDER_SHIPPED,
			targetOrder: result,
			transactionHash,
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
	const { transactionHash } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
	});
	if (order) {
		order.status = OrderStatus.CANCELED;
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.TIME_OUT_ORDER,
			targetOrder: result,
			transactionHash,
		});
		const newActivityResult = await newActivity.save();
		publishActivityHistory({
			userIds: [order.buyer.id, contract.seller.id],
			activityHistory: newActivityResult,
		});
	}
};

const onCompleteHandler = async (contract: Contract, event: any) => {
	const { _id } = event.args;
	const { transactionHash } = event;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
		relations: ['buyer'],
	});
	if (order) {
		order.status = OrderStatus.COMPLETE;
		const result = await order.save();
		const newActivity = await ActivityHistory.create({
			type: ActivityHistoryType.ORDER_COMPLETED,
			targetOrder: result,
			transactionHash,
		});
		const newActivityResult = await newActivity.save();
		publishActivityHistory({
			userIds: [contract.seller.id, order.buyer.id],
			activityHistory: newActivityResult,
		});
	}
};

const contractEvents = [
	{
		id: 'orderCreated',
		topics: [
			id('OrderCreated(bytes32,address,uint256,uint256,uint256,uint256)'),
		],
		handlerFunction: onOrderCreatedHandler,
	},
	{
		id: 'paid',
		topics: [id('Paid(bytes32,address)')],
		handlerFunction: onPaidHandler,
	},
	{
		id: 'shipping',
		topics: [id('Shipping(bytes32)')],
		handlerFunction: onShippingHandler,
	},
	{
		id: 'sellerConfirmOrderShipped',
		topics: [id('SellerComplete(bytes32, address)')],
		handlerFunction: onSellerConfirmShippedHandler,
	},
	{
		id: 'buyerConfirmOrderShipped',
		topics: [id('BuyerComplete(bytes32, address)')],
		handlerFunction: onBuyerConfirmShippedHandler,
	},
	{
		id: 'timeout',
		topics: [id('Timeout(bytes32)')],
		handlerFunction: onTimeoutHandler,
	},
	{
		id: 'complete',
		topics: [id('Complete(bytes32,address)')],
		handlerFunction: onCompleteHandler,
	},
];

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
	const createOrderHash = await etherContract.createOrder([
		buyerAddress,
		BigInt(price),
		BigInt(shipDeadline),
		BigInt(nonce),
		name,
	], signature
	);
	console.log("createOrderHash", createOrderHash)
	return createOrderHash;
};

const getContractNonce = async (address: string) => {
	const etherContract = new EthersContract(address, IEcommerceShop, provider);
	const nonce = await etherContract.getNonce();
	if (typeof nonce === 'bigint') return Number(nonce);
	return nonce;
};

const getCurrentBlockTimestamp = async () => {
	return (await provider.getBlock('latest'))?.timestamp;
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

const generateMerchantSecretKey = () => {
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

export {
	listenEventsBootstrap,
	initEventListenerForContract,
	createOrder,
	getContractNonce,
	getCurrentBlockTimestamp,
	deployECommerceContract,
	generateMerchantSecretKey,
};
