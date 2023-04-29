import { Field, ObjectType } from "type-graphql";
import { IMutationResponse } from "./IMutationResponse";
import { MerchantMetaData } from "../entities/MerchantMetaData";

@ObjectType({ implements: IMutationResponse })
export class MerchantMetadataMutationResponse implements IMutationResponse {
  code: number
	success: boolean
	message?: string
  
  @Field()
	merchantMetaData?: MerchantMetaData
}