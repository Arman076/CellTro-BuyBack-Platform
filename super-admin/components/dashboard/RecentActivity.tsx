import {
  CircleDollarSign,
  Package,
  Settings,
  Store,
  UserRoundSearch,
} from "lucide-react";

import type {
  ActivityItem,
} from "@/lib/dashboard-types";

import styles from "./RecentActivity.module.css";

type Props = {
  activities: ActivityItem[];
};

function getIcon(
  type: ActivityItem["type"],
) {
  switch (type) {
    case "ORDER":
      return Package;

    case "ENQUIRY":
      return UserRoundSearch;

    case "VENDOR":
      return Store;

    case "PAYMENT":
      return CircleDollarSign;

    default:
      return Settings;
  }
}

export default function RecentActivity({
  activities,
}: Props) {
  if (!activities.length) {
    return (
      <div className={styles.empty}>
        No recent activity.
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {activities.map(
        (activity) => {
          const Icon = getIcon(
            activity.type,
          );

          return (
            <div
              key={activity.id}
              className={styles.item}
            >
              <div
                className={
                  styles.iconBox
                }
              >
                <Icon size={17} />
              </div>

              <div
                className={
                  styles.content
                }
              >
                <strong>
                  {activity.title}
                </strong>

                <p>
                  {
                    activity.description
                  }
                </p>

                <span>
                  {new Date(
                    activity.createdAt,
                  ).toLocaleString(
                    "en-IN",
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    },
                  )}
                </span>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}