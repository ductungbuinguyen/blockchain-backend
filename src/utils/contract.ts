import { OrderStatus } from './../types/OrderStatus';
import { Order } from './../entities/Oder';
import { Contract } from '../entities/Contract';
import { Contract as EthersContract, providers, Wallet } from 'ethers';
import IEcommerceShop from '../ABIs/IEcommerceShop.json';
import { User } from '../entities/User';
import { id } from 'ethers/lib/utils';
const provider = new providers.WebSocketProvider(
	'wss://eth-goerli.g.alchemy.com/v2/uqHGkZMFr_B6Tk7ojrb3Na1dcAcGNC6k'
);
const wallet = new Wallet(
	'71ef0e17f75ecb40b512b9f4aed33a5d6aba27649e50fecf0871b3fd35ae1a62',
	provider
);

const eShopContractFactoryAddress = '';

const listenEventsBootstrap = async () => {
	const contracts = await Contract.find();
	contracts.forEach((contract) => {
		initEventListenerForContract(contract);
	});
};

const onOrderCreatedHandler = async (contract: Contract, event: any) => {
	const { _id, _buyer, _price, _shipDeadline, _confirmDeadline, _orderTime } =
		event.args;
	const buyer = await User.findOne({
		where: {
			metaMaskPublicKey: _buyer,
		},
	});
	const data = {
		buyer,
		price: Number(_price),
		contract,
		confirmDeadline: Number(_confirmDeadline),
		shipDeadline: Number(_shipDeadline),
		decentralizedId: _id,
		status: OrderStatus.CREATED,
		orderTime: Number(_orderTime),
	};
	const order = await Order.create(data);
	const result = order.save();
	console.log('result', result);
};

const onPaidHandler = async (_contract: Contract, event: any) => {
	const { _id } = event.args;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
	});
	if (order) {
		order.status = OrderStatus.PAID;
		await order.save();
	}
};

const onShippingHandler = async (_contract: Contract, event: any) => {
	const { _id } = event.args;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
	});
	if (order) {
		order.status = OrderStatus.SHIPPING;
		await order.save();
	}
};

const onTimeoutHandler = async (_contract: Contract, event: any) => {
	const { _id } = event.args;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
	});
	if (order) {
		order.status = OrderStatus.CANCELED;
		await order.save();
	}
};

const onCompleteHandler = async (_contract: Contract, event: any) => {
	const { _id } = event.args;
	const order = await Order.findOne({
		where: {
			decentralizedId: _id,
		},
	});
	if (order) {
		order.status = OrderStatus.COMPLETE;
		await order.save();
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
}: any) => {
	const etherContract = new EthersContract(
		contractAddress,
		IEcommerceShop,
		wallet
	);
	return await etherContract.createOrder([
		buyerAddress,
		BigInt(price),
		BigInt(shipDeadline),
		BigInt(nonce),
		signature,
	]);
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
		IEcommerceShop,
		wallet
	);
	return await etherContract.deployEShop([merchantAddress]);
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
