import { createRoot } from "react-dom/client";
import { useReportLookup } from "../../src/data/report-lookup";
function Harness() {
  const state = useReportLookup("one", true);
  return (
    <>
      <button
        onClick={() => {
          Object.assign(window, { historyUid: "bob" });
          window.dispatchEvent(new Event("history-account"));
        }}
      >
        Cambiar cuenta
      </button>
      <button
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("report-updated", { detail: "one" }),
          )
        }
      >
        Actualizar
      </button>
      <output data-testid="data">{JSON.stringify(state)}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
