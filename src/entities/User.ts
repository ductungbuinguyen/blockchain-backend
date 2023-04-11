import { Gender } from './../types/Gender';
import { Field, ID, ObjectType } from 'type-graphql';
import {
	BaseEntity,
	Column,
	Entity,
	JoinColumn,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './Order';
import { Contract } from './Contract';
import { MerchantMetaData } from './MerchantMetaData';
import { ActivityHistory } from './ActivityHistory';

@ObjectType()
@Entity()
export class User extends BaseEntity {
	@Field((_type) => ID)
	@PrimaryGeneratedColumn()
	id!: number;

	@Field()
	@Column({ unique: true })
	email!: string;

	@Field(() => Gender)
	@Column({
		type: 'enum',
		enum: Gender,
		nullable: true,
	})
	gender?: string;

	@Field()
	@Column({
		nullable: true,
	})
	fullName?: string;

	@Field()
	@Column({
		nullable: true,
	})
	phoneNumber?: string;

	@Field()
	@Column({
		nullable: true,
	})
	identityCode?: string;

	@Field()
	@Column({
		nullable: true,
	})
	metaMaskPublicKey: string;

	@Column({
		nullable: true,
	})
	password!: string;

	@Column({ default: 0 })
	tokenVersion: number;

	@Field(() => [Contract])
	@OneToOne(() => Contract, (contract) => contract.seller)
	@JoinColumn()
	contract: Contract;

	@Field(() => [MerchantMetaData])
	@OneToOne(
		() => MerchantMetaData,
		(merchantMetaData) => merchantMetaData.owner
	)
	@JoinColumn()
	merchantMetaData: MerchantMetaData;

	@Field(() => [Order])
	@OneToMany(() => Order, (order) => order.buyer)
	ordersAsBuyer: Order[];

	@Field(() => [ActivityHistory])
	@OneToMany(() => ActivityHistory, (activity) => activity.owner)
	activityHistoriesAsOwner: ActivityHistory[]

	@Field(() => [ActivityHistory])
	@OneToMany(() => ActivityHistory, (activity) => activity.owner)
	activityHistoriesAsDestination: ActivityHistory[]

	@Field()
	@Column({
		nullable: true,
	})
	Base64Avatar: string
}
