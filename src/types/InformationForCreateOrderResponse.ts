import { Field, ObjectType } from "type-graphql";
import { IMutationResponse } from "./IMutationResponse";

@ObjectType({ implements: IMutationResponse })
export class InformationForCreateOrderResponse implements IMutationResponse {
  code: number

  success: boolean

  message?: string

  @Field({nullable: true})
	nonce?: number

  @Field({nullable: true})
	buyerAddress?: string

  @Field({nullable: true})
	currentBlockTimestamp?: number
}