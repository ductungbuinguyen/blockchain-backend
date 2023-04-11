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
  @ManyToOne(() => User, (user) => user.activityHistoriesAsOwner)
  @JoinColumn({ name: "ownerUserId" })
  owner: User

  @Field()
  @Column()
  type: ActivityHistoryType;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.activityHistoriesAsDestination, {nullable: true})
  @JoinColumn({ name: "destinationUserId" })
  destinationUser: User

  @Field()
  @Column({nullable: true})
  destinationAddress: string

  @Field(() => Order)
  @ManyToOne(() => Order, (order) => order.activityHistories, { nullable: true })
  @JoinColumn({ name: "targetOrderId" })
  targetOrder: Order

  @Field(() => Contract)
  @OneToOne(() => Contract, (contract) => contract.activityHistory, {nullable: true})
  @JoinColumn({ name: "targetContractId" })
  targetContract: Contract

  @Field()
  @Column()
  transactionHash: string

  @Field()
  @Column('timestamp without time zone', {
    default: () => 'CURRENT_TIMESTAMP',
  })
  creationTime: Date;
}