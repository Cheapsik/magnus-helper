import { ReactFlowProvider } from "@xyflow/react";
import { RelationsMapProvider } from "./context/RelationsMapContext";
import { RelationsMapLayout } from "./RelationsMapLayout";

export function RelationsMapRoot() {
  return (
    <ReactFlowProvider>
      <RelationsMapProvider>
        <RelationsMapLayout />
      </RelationsMapProvider>
    </ReactFlowProvider>
  );
}

export default RelationsMapRoot;
