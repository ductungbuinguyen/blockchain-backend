import { ObjectType, Field } from "type-graphql"
import { IMutationResponse } from "./IMutationResponse"
import { MerchantMetaData } from "../entities/MerchantMetaData"

@ObjectType({ implements: IMutationResponse })
export class MerchantMutationResponse implements IMutationResponse {
	code: number
	success: boolean
	message?: string

	@Field({nullable: true})
	merchantMetaData?: MerchantMetaData
}