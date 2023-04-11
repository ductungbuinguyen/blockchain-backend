import { Field, ObjectType } from "type-graphql";
import { IMutationResponse } from "./IMutationResponse";
import { ActivityHistory } from "../entities/ActivityHistory";

@ObjectType({ implements: IMutationResponse })
export class ActivityHistoryMutationResponse implements IMutationResponse {
  code: number
	success: boolean
	message?: string
  
  @Field({ nullable: true })
	activityHistory?: ActivityHistory
}