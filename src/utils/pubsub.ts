import { NeedToRefreshData } from './../types/NeedToRefreshData';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub()

const publishNeedToRefreshData = ({
  type,
}: NeedToRefreshData) => {
  pubsub.publish('NEED_TO_REFRESH_DATA', { type });
}

export {
  pubsub,
  publishNeedToRefreshData,
}