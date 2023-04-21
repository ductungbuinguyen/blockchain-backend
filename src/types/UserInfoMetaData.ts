import { ActivityHistory } from '../entities/ActivityHistory';
import { Field, ObjectType } from 'type-graphql';
import { Order } from '../entities/Order';
import { Contract } from '../entities/Contract';
import { MerchantMetaData } from '../entities/MerchantMetaData';
import { Gender } from './Gender';

@ObjectType()
export class UserInfoMetaData {
  @Field()
  id: number;

  @Field()
  email: string;

  @Field(() => [ActivityHistory])
  activityHistoriesAsReceiver: ActivityHistory[];

  @Field(() => [Order])
  ordersAsBuyer: Order[];

  @Field(() => [ActivityHistory])
  activityHistoriesAsSender: ActivityHistory[];

  @Field(() => Gender)
  gender?: Gender;

  @Field()
  base64Avatar: string;

  @Field()
  identityCode?: string;

  @Field(() => Contract)
  contract: Contract;

  @Field()
  fullName?: string;

  @Field(() => MerchantMetaData)
  merchantMetaData: MerchantMetaData;

  @Field()
  metaMaskPublicKey: string;

  @Field()
  phoneNumber?: string;
}
