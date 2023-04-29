import { Field, InputType } from 'type-graphql';

@InputType()
export class UpdateUserMerchantMetadataInput {
  @Field()
  companyName: string;
  
  @Field()
  companyIdentify: string;

  @Field()
  businessField: string;

  @Field()
  websiteUrl: string;

  @Field()
  storeLocation: string;

  @Field()
  note: string;
}