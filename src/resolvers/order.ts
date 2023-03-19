import { CreateOrderInput } from './../types/CreateOrderInput';
import { User } from './../entities/User';
import { CreateOrderMutationResponse } from './../types/CreateOrderMutationResponse';
import { Resolver, Mutation, Arg } from 'type-graphql';
import { createOrder } from '../../src/utils/contractHandler';

@Resolver()
export class OrderResolver {
	@Mutation((_return) => CreateOrderMutationResponse)
	async createOrder(
		@Arg('createOrderInput') createOrderInput: CreateOrderInput
	): Promise<CreateOrderMutationResponse> {
		const {
			buyerEmail,
			nonce,
			price,
			sellerEmail,
			shipDeadlineAmount,
			signature,
		} = createOrderInput;
		const existingSeller = await User.findOne({
			where: {
				email: sellerEmail,
			},
			relations: ['contract'],
		});
		const existingBuyer = await User.findOne({
			where: {
				email: buyerEmail,
			},
		});
		if (!existingSeller || !existingBuyer) {
			return {
				code: 400,
				success: false,
			};
		}
    await createOrder({
      contractAddress: existingSeller?.contract?.address,
      buyerAddress: existingBuyer.metaMaskPublicKey,
      nonce,
      price,
      shipDeadlineAmount,
      signature,
    })
    return {
      code: 200,
      success: true,
    }
	}
}
