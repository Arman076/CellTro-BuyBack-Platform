import type {
  OrderStatusData,
} from "@/lib/dashboard-types";

import styles from "./OrderStatusChart.module.css";

type Props = {
  data: OrderStatusData[];
};

export default function OrderStatusChart({
  data,
}: Props) {
  if (!data.length) {
    return (
      <div className={styles.empty}>
        No order status data available.
      </div>
    );
  }

  const total = data.reduce(
    (sum, item) =>
      sum + item.count,
    0,
  );

  return (
    <div className={styles.list}>
      {data.map((item) => {
        const percentage =
          total > 0
            ? (item.count / total) *
              100
            : 0;

        return (
          <div
            key={item.status}
            className={styles.item}
          >
            <div
              className={styles.row}
            >
              <span>
                {item.status
                  .replaceAll("_", " ")
                  .toLowerCase()
                  .replace(
                    /\b\w/g,
                    (letter) =>
                      letter.toUpperCase(),
                  )}
              </span>

              <div>
                <strong>
                  {item.count.toLocaleString(
                    "en-IN",
                  )}
                </strong>

                <small>
                  {percentage.toFixed(
                    1,
                  )}
                  %
                </small>
              </div>
            </div>

            <div
              className={styles.track}
            >
              <span
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}