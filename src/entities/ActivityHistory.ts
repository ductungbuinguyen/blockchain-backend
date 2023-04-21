import { Field, ID, ObjectType } from "type-graphql";
import { Entity, BaseEntity, PrimaryGeneratedColumn, OneToOne, ManyToOne, Column, JoinColumn } from "typeorm";
import { User } from "./User";
import { Order } from "./Order";
import { Contract } from "./Contract";
import { ActivityHistoryType } from '../types/ActivityHistoryType';

@ObjectType()
@Entity()

export class ActivityHistory extends BaseEntity {
  @Field(_type => ID)
	@PrimaryGeneratedColumn()
	id!: number

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.activityHistoriesAsSender)
  @JoinColumn()
  sender: User

  @Field(() => ActivityHistoryType)
  @Column({
		nullable: true,
		type: "enum",
		enum: ActivityHistoryType,
	})
  type: ActivityHistoryType;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.activityHistoriesAsReceiver, {nullable: true})
  @JoinColumn()
  receiver: User

  @Field()
  @Column({nullable: true})
  receiverAddress: string

  @Field(() => Order)
  @ManyToOne(() => Order, (order) => order.activityHistories, { nullable: true })
  @JoinColumn()
  targetOrder: Order

  @Field(() => Contract)
  @OneToOne(() => Contract, (contract) => contract.activityHistory, {nullable: true})
  @JoinColumn({ name: "targetContractId" })
  targetContract: Contract

  @Field()
  @Column()
  transactionHash: string

  @Field()
  @Column({
    type: 'decimal',
    nullable: true,
  })
  amount: number

  @Field()
  @Column('timestamp without time zone', {
    default: () => 'CURRENT_TIMESTAMP',
  })
  creationTime: Date;
}