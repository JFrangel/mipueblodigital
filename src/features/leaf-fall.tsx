import styles from "./banana-leaves.module.css";

/** Hojas ilustradas que acompañan el envío sin interceptar los controles. */
export function LeafFall({
  drifting = false,
}: {
  count?: number;
  drifting?: boolean;
}) {
  return (
    <div
      className={`${styles.frame} ${drifting ? styles.sending : ""}`}
      aria-hidden="true"
    >
      {["left", "right"].map((side) => (
        <div
          key={side}
          className={side === "left" ? styles.left : styles.right}
        >
          <svg viewBox="0 0 120 320" fill="none">
            <path
              d="M31 314C33 209 75 126 99 12"
              stroke="#acbd70"
              strokeWidth="3"
            />
            <path
              d="M96 14C35 30 2 86 14 144l26-15-23 26c5 25 14 45 26 64l19-39-12 54c39-24 66-58 65-103l-16 10 15-23c2-35-3-69-18-104Z"
              fill="#24634b"
            />
            <path
              d="M96 14C83 78 62 151 43 219c-12-19-21-39-26-64l23-26-26 15C2 86 35 30 96 14Z"
              fill="#4a8751"
            />
            <path
              d="M96 14C81 85 61 151 43 219"
              stroke="#c1d17e"
              strokeWidth="2"
            />
            <g stroke="#a9c577" strokeWidth="1" opacity=".6">
              <path d="m87 51-43 6m35 22-50 9m41 20-49 11m40 17-35 13m28 10-20 16m54-126 15 22M80 78l27 23m-36 6 36 23m-46 5 36 24m-45 3 32 20m-42 8 22 12" />
            </g>
            <path
              d="M32 301C3 274-8 232 7 193c37 20 53 51 41 80l-12-9 8 20Z"
              fill="#376e4a"
            />
            <path
              d="M7 193c17 33 24 61 25 108m-13-79 19 10m-12 14 17 8m-14 7-17-10"
              stroke="#a9c577"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
