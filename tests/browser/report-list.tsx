import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useRemoteReportList } from "../../src/data/remote-report-list";

async function request(signal: AbortSignal, uid: string) {
  const response = await fetch(`/api/reports?uid=${uid}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data as { items: { id: string }[]; complete: boolean };
}
function Harness() {
  const [uid, setUid] = useState("alice"),
    [online, setOnline] = useState(true);
  const state = useRemoteReportList(uid, online, true, request);
  return (
    <>
      <button onClick={state.reload}>Actualizar</button>
      <button onClick={() => setUid((v) => (v === "alice" ? "bob" : "alice"))}>
        Cambiar cuenta
      </button>
      <button onClick={() => setOnline((v) => !v)}>Cambiar conexión</button>
      <output data-testid="uid">{uid}</output>
      <output data-testid="loading">{String(state.loading)}</output>
      <output data-testid="complete">{String(state.complete)}</output>
      <output data-testid="items">{JSON.stringify(state.items)}</output>
      <output data-testid="error">{state.error}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
