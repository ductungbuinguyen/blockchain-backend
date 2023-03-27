import { InputType, Field } from "type-graphql"

@InputType()
export class RegisterMerchantInput {
  @Field()
	companyName: string
  
  @Field()
	businessField: string
  
  @Field()
	websiteUrl: string
  
  @Field()
	storeLocation: string
  
  @Field()
	companyIdentify: string
  
  @Field()
	note: string
}