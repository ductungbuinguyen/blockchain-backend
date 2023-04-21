import { Field, ObjectType } from "type-graphql";
import { IMutationResponse } from "./IMutationResponse";

@ObjectType({ implements: IMutationResponse })
export class InformationForCreateOrderResponse implements IMutationResponse {
  code: number

  success: boolean

  message?: string

  @Field()
	nonce?: string

  @Field()
	buyerAddress?: string

  @Field()
	currentBlockTimestamp?: number
}