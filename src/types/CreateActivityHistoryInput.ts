import { Field, InputType } from "type-graphql";
import { ActivityHistoryType } from "./ActivityHistoryType";

@InputType()
export class CreateActivityHistoryInput {
  @Field(() => ActivityHistoryType)
  type: ActivityHistoryType

  @Field()
  destinationAddress?: string

  @Field()
  destinationUserId?: number 

  @Field()
  amount: number

  @Field()
  transactionHash: string
}