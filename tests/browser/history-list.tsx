import { useState } from "react";
import { createRoot } from "react-dom/client";
import { HistoryList } from "../../src/features/remote-history";
import { useRemoteHistory } from "../../src/data/remote-history";
function Harness() {
  const [id, setId] = useState("A");
  const [enabled, setEnabled] = useState(true);
  const state = useRemoteHistory(id, enabled);
  return (
    <>
      <button onClick={() => setId("B")}>Cambiar reporte</button>
      <button onClick={() => setEnabled((v) => !v)}>Activar consulta</button>
      <button onClick={state.more}>Mas</button>
      <button
        onClick={() => {
          Object.assign(window, { historyUid: "bob" });
          window.dispatchEvent(new Event("history-account"));
        }}
      >
        Cambiar cuenta
      </button>
      <HistoryList state={state} />
      <output data-testid="id">{id}</output>
      <output data-testid="items">{JSON.stringify(state.items)}</output>
      <output data-testid="busy">{String(state.busy)}</output>
      <output data-testid="error">{state.error}</output>
      <output data-testid="next">{state.next}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
