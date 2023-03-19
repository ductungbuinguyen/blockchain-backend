import { OrderStatus } from '../types/OrderStatus';
import { ObjectType, Field, ID } from "type-graphql";
import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";
import { Contract } from './Contract';

@ObjectType()
@Entity()
export class Order extends BaseEntity {
  @Field(_type => ID)
	@PrimaryGeneratedColumn()
	id!: number

  @Field(_type => ID)
	@Column()
	decentralizedId!: number

  @Field()
	@Column({nullable: true})
	price?: number

  @Field()
	@Column({nullable: true})
	shipDeadline?: number

  @Field()
	@Column({nullable: true})
	confirmDeadline?: number

  @Field(() => [User])
	@ManyToOne(() => User, (user) => user.ordersAsBuyer)
  buyer: User

  @Field(() => [Contract])
	@ManyToOne(() => Contract, (contract) => contract.seller)
  contract: Contract

	@Field(() => OrderStatus)
	@Column({
		nullable: true,
		type: "enum",
		enum: OrderStatus,
	})
	status?: OrderStatus;
}