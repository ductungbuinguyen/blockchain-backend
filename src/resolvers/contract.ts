import { User } from './../entities/User';
import { Arg, ID, Mutation, Resolver } from "type-graphql";
import { UserMutationResponse } from 'src/types/UserMutationResponse';
import { CreateContractMutationResponse } from 'src/types/CreateContractMutationResponse';
import { Contract } from '../entities/Contract';
import { createNewContract } from '../utils/contractHandler';

@Resolver()
export class ContractResolver {
  @Mutation(_return => UserMutationResponse)
  async createContract(
    @Arg('userId', _type => ID) userId: number,
  ): Promise<CreateContractMutationResponse> {
    const existingUser = await User.findOne(userId)
    if (!existingUser) {
			return {
				code: 400,
				success: false
			}
		}
    const address = await createNewContract(existingUser.metaMaskPublicKey)
    if(!address) return {
      code: 400,
			success: false
    }
    const contract = new Contract()
    contract.seller = existingUser
    contract.address = address
    const contractRecord = await contract.save()
    return {
      code: 200,
      success: true,
      contract: contractRecord,
    }
  }
}