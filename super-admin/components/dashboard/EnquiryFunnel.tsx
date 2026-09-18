import type {
  FunnelData,
} from "@/lib/dashboard-types";

import styles from "./EnquiryFunnel.module.css";

type Props = {
  data:
    | FunnelData
    | null;
};

const stages = [
  {
    key:
      "questionnaireCompleted",
    label:
      "Questionnaire Completed",
  },
  {
    key:
      "identityVerified",
    label:
      "Identity Verified",
  },
  {
    key:
      "quoteViewed",
    label:
      "Quote Viewed",
  },
  {
    key:
      "orderPlaced",
    label:
      "Order Placed",
  },
  {
    key:
      "completed",
    label:
      "Completed",
  },
] as const;

export default function EnquiryFunnel({
  data,
}: Props) {
  if (!data) {
    return (
      <div
        className={
          styles.empty
        }
      >
        Funnel data is not
        available.
      </div>
    );
  }

  const max =
    Math.max(
      1,
      ...stages.map(
        (
          stage,
        ) =>
          data[
            stage.key
          ],
      ),
    );

  return (
    <div>
      <div
        className={
          styles.list
        }
      >
        {stages.map(
          (
            stage,
          ) => {
            const value =
              data[
                stage.key
              ];

            const width =
              Math.max(
                4,
                (
                  value /
                  max
                ) *
                  100,
              );

            return (
              <div
                key={
                  stage.key
                }
                className={
                  styles.row
                }
              >
                <div
                  className={
                    styles.rowHeader
                  }
                >
                  <span>
                    {
                      stage.label
                    }
                  </span>

                  <strong>
                    {
                      value
                    }
                  </strong>
                </div>

                <div
                  className={
                    styles.track
                  }
                >
                  <div
                    className={
                      styles.fill
                    }
                    style={{
                      width:
                        `${width}%`,
                    }}
                  />
                </div>
              </div>
            );
          },
        )}
      </div>

      <div
        className={
          styles.otpMeta
        }
      >
        Actual SMS OTP
        verifications:{" "}
        <strong>
          {
            data.otpVerified
          }
        </strong>
      </div>
    </div>
  );
}
