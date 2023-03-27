import { ObjectType, Field, ID } from "type-graphql";
import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, OneToOne } from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class MerchantMetaData extends BaseEntity {
  @Field(_type => ID)
	@PrimaryGeneratedColumn()
	id!: number

  @Field()
	@Column()
	companyName!: string

  @Field()
	@Column({ unique: true })
  companyIdentify!: string

  @Field()
	@Column({
    nullable: true,
  })
  businessField: string;

  @Field()
	@Column({
    nullable: true,
  })
  websiteUrl: string;

  @Field()
	@Column({
    nullable: true,
  })
  storeLocation: string;

  @Field()
	@Column({
    nullable: true,
  })
  note: string;

  @Field()
	@Column()
  merchantSecretKey: string;

  @Field(() => User)
	@OneToOne(() => User, (user) => user.merchantMetaData)
  owner!: User
}