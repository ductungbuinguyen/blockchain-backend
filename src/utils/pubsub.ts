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

export {
  pubsub,
  publishActivityHistory,
}