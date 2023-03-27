import { Context } from './../types/Context';
import { User } from './../entities/User';
import {
	Arg,
	Ctx,
	Mutation,
	Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import {
	createOrder,
	getContractNonce,
  getCurrentBlockTimestamp,
} from '../utils/contract';
import { CreateOrderInput } from '../types/CreateOrderInput';
import { CreateOrderMutationResponse } from '../types/CreateOrderMutationResponse';
import { InformationForCreateOrderInput } from '../types/InformationForCreateOrderInput';
import { InformationForCreateOrderResponse } from '../types/InformationForCreateOrderResponse';
import { checkAuth } from '../middleware/checkAuth';

@Resolver()
export class ContractResolver {
	@Query((_return) => InformationForCreateOrderResponse)
	@UseMiddleware(checkAuth)
	async informationForCreateOrder(
		@Arg('informationForCreateOrderInput')
		informationForCreateOrderInput: InformationForCreateOrderInput,
		@Ctx() { user }: Context
	): Promise<InformationForCreateOrderResponse> {
		const existingUser = await User.findOne({
			where: { id: user.userId },
			relations: ['contract'],
		});
		if (!existingUser) {
			return {
				code: 500,
				success: false,
			};
		}
		const nonce = await getContractNonce(existingUser?.contract?.address);
    const timestamp = await getCurrentBlockTimestamp();
		const { buyerEmail } = informationForCreateOrderInput;
		const buyerUser = await User.findOne({
			where: { email: buyerEmail },
			relations: ['contract'],
		});
		const buyerAddress = buyerUser?.metaMaskPublicKey
		if(!nonce || !timestamp || !buyerAddress) {
			return {
				code: 500,
				success: false,
				message: 'Something happen when getting data for create order',
			}
		}
		return {
			code: 200,
			success: true,
			buyerAddress,
			nonce,
			currentBlockTimestamp: timestamp,
		}
	}

	@Mutation((_return) => CreateOrderMutationResponse)
	@UseMiddleware(checkAuth)
	async createOrder(
		@Arg('createOrderInput') createOrderInput: CreateOrderInput,
		@Ctx() { user }: Context
	): Promise<CreateOrderMutationResponse> {
		const { buyerAddress, nonce, price, shipDeadline, signature } =
			createOrderInput;
		const existingUser = await User.findOne({
			where: { id: user.userId },
			relations: ['contract'],
		});
		if (!existingUser) {
			return {
				code: 500,
				success: false,
			};
		}
		await createOrder({
			contractAddress: existingUser?.contract?.address,
			buyerAddress: buyerAddress,
			nonce,
			price,
			shipDeadline,
			signature,
		});
		return {
			code: 200,
			success: true,
		};
	}
}
