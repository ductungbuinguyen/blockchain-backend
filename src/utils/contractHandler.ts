import { OrderStatus } from './../types/OrderStatus';
import { Order } from './../entities/Oder';
import { Contract } from '../entities/Contract';
import { WebSocketProvider, Contract as EthersContract, Wallet } from 'ethers';
import * as IEcommerceShop from '../ABIs/IEcommerceShop.json';
import { User } from '../entities/User';
import {
	OrderCreatedParameter,
	CompleteParameter,
	PaidParameter,
	ShippingParameter,
	TimeoutParameter,
} from './../types/ContractEventsParameters';
const provider = new WebSocketProvider(
	'wss://eth-goerli.g.alchemy.com/v2/uqHGkZMFr_B6Tk7ojrb3Na1dcAcGNC6k'
);
const wallet = new Wallet('71ef0e17f75ecb40b512b9f4aed33a5d6aba27649e50fecf0871b3fd35ae1a62')
const listenEventsBootstrap = async () => {
	const contracts = await Contract.find();
	contracts.forEach((contract) => {
		initEventListenerForContract(contract);
	});
};

const initEventListenerForContract = (contract: Contract) => {
	
	const { address } = contract;
	const etherContract = new EthersContract(address, IEcommerceShop, provider);
	etherContract.on('OrderCreated', (...args: OrderCreatedParameter) =>
		onOrderCreatedHandler(contract, ...args)
	);
	etherContract.on('Paid', (...args: PaidParameter) =>
		onPaidHandler(contract, ...args)
	);
	etherContract.on('Shipping', (...args: ShippingParameter) =>
		onShippingHandler(contract, ...args)
	);
	etherContract.on('Timeout', (...args: TimeoutParameter) =>
		onTimeoutHandler(contract, ...args)
	);
	etherContract.on('Complete', (...args: CompleteParameter) =>
		onCompleteHandler(contract, ...args)
	);
};

const onOrderCreatedHandler = async (
	contract: Contract,
	id: number,
	buyerKey: number,
	price: number,
	shipDeadline: number,
	confirmDeadline: number,
	_orderTime: number
) => {
	const buyer = await User.findOne({
		where: {
			metaMaskPublicKey: buyerKey,
		},
	});
	return await Order.create({
		buyer,
		price,
		contract,
		confirmDeadline,
		shipDeadline,
		decentralizedId: id,
		status: OrderStatus.CREATED,
	});
};

const onPaidHandler = async (contract: Contract, ..._args: PaidParameter) => {
	const order = await Order.findOne({
		where: {
			contract: contract,
		},
	});
	if (order) {
		order.status = OrderStatus.PAID;
		await order.save();
	}
};

const onShippingHandler = async (
	contract: Contract,
	..._args: ShippingParameter
) => {
	const order = await Order.findOne({
		where: {
			contract: contract,
		},
	});
	if (order) {
		order.status = OrderStatus.SHIPPING;
		await order.save();
	}
};

const onTimeoutHandler = async (
	contract: Contract,
	..._args: TimeoutParameter
) => {
	const order = await Order.findOne({
		where: {
			contract: contract,
		},
	});
	if (order) {
		order.status = OrderStatus.CANCELED;
		await order.save();
	}
};

const onCompleteHandler = async (
	contract: Contract,
	..._args: CompleteParameter
) => {
	const order = await Order.findOne({
		where: {
			contract: contract,
		},
	});
	if (order) {
		order.status = OrderStatus.CONFIRMED;
		await order.save();
	}
};

const createNewContract = async (_sellerAddress: string) => {
	return (await Contract.findOne())?.address;
};

const createOrder = async ({
	contractAddress,
	buyerAddress,
	nonce,
	price,
	shipDeadlineAmount,
	signature,
}: any) => {
	const timestamp = (await provider.getBlock("latest"))?.timestamp || 0;
	const etherContract = new EthersContract(contractAddress, IEcommerceShop, wallet);
	return await etherContract.createOrder([buyerAddress, price, timestamp + shipDeadlineAmount, nonce, signature])
};

export {
	listenEventsBootstrap,
	initEventListenerForContract,
	createNewContract,
	createOrder,
};
