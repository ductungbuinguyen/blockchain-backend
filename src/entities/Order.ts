import { OrderStatus } from '../types/OrderStatus';
import { ObjectType, Field, ID } from "type-graphql";
import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { User } from "./User";
import { Contract } from './Contract';
import { ActivityHistory } from './ActivityHistory';

@ObjectType()
@Entity()
export class Order extends BaseEntity {
  @Field(_type => ID)
	@PrimaryGeneratedColumn()
	id!: number

  @Field(_type => ID)
	@Column()
	decentralizedId!: string

  @Field()
	@Column({
		nullable: true,
	})
	price?: string

  @Field()
	@Column({
		nullable: true,
		type: 'bigint',
	})
	shipDeadline?: number

  @Field()
	@Column({
		nullable: true,
		type: 'bigint',
	})
	confirmDeadline?: number

  @Field(() => User)
	@ManyToOne(() => User, (user) => user.ordersAsBuyer)
  buyer: User

  @Field(() => Contract)
	@ManyToOne(() => Contract, (contract) => contract.orders)
  contract: Contract

	@Field(() => OrderStatus)
	@Column({
		nullable: true,
		type: "enum",
		enum: OrderStatus,
	})
	status?: OrderStatus;

	@Field()
	@Column({
		nullable: true,
		type: 'bigint',
	})
	orderTime?: number

	@Field(() => [ActivityHistory])
	@OneToMany(() => ActivityHistory, (activity) => activity.targetOrder)
	activityHistories: ActivityHistory[]

	@Field()
	@Column({
		nullable: true,
	})
	base64QrCode: string;

	@Field()
  @Column('timestamp without time zone', {
    default: () => 'CURRENT_TIMESTAMP',
  })
  creationTime: Date;

	@Field()
	@Column({
		nullable: true,
	})
	name: string;

	@Field()
	@Column({
		nullable: true,
	})
	isSellerConfirm: boolean;

	@Field()
	@Column({
		nullable: true,
	})
	isBuyerConfirm: boolean;
}