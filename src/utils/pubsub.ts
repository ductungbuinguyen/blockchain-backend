import { PubSub } from 'graphql-subscriptions';
import { ActivityHistoryPayload } from '../types/ActivityHistoryPayload';

const pubsub = new PubSub()

const publishActivityHistory = ({
  activityHistory,
  userIds,
}: ActivityHistoryPayload) => {
  pubsub.publish('ACTIVITY_HISTORY', { 
    activityHistory,
    userIds
  });
}

// setInterval(async () => {
//   // console.log('in here')
//   const newActivity = await ActivityHistory.create({
// 		type: ActivityHistoryType.REGISTER_MERCHANT,
// 		transactionHash: "test test",
// 	});
//   pubsub.publish('ACTIVITY_HISTORY', { 
//     activityHistory: newActivity,
//     userIds: [3,4,5,6,7]
//   });
// }, 1000)

export {
  pubsub,
  publishActivityHistory,
}