import { ActivityHistory } from "src/entities/ActivityHistory";

export interface ActivityHistoryPayload {
  activityHistory: ActivityHistory,
  userIds: number[];
}
