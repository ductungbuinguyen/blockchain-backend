import { ObjectType } from "type-graphql"
import { IMutationResponse } from "./IMutationResponse"

@ObjectType({ implements: IMutationResponse })
export class MutationResponse implements IMutationResponse {
  code: number
	success: boolean
	message?: string
}