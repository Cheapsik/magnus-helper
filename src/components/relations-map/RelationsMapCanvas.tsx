import { useCallback, useEffect, useMemo, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { typeColor } from "./colors";
import { relationEdgeMarkers } from "./edgeMarkers";
import { EntityNode } from "./nodes/EntityNode";
import { RelationEdge } from "./edges/RelationEdge";
import { useRelationsMap } from "./context/RelationsMapContext";
import { MapToolbar } from "./panels/MapToolbar";
import { FloatingPanels } from "./panels/FloatingPanels";
import { QuickRelationPicker } from "./dialogs/QuickRelationPicker";
import { RelationEditDialog } from "./dialogs/RelationEditDialog";
import type { MapNodeData, RelationEdgeData } from "./types";

const nodeTypes = { entity: EntityNode };
const edgeTypes = { relation: RelationEdge };

function FlowCanvasInner() {
  const rf = useReactFlow();
  const {
    persisted,
    setPersisted,
    lookup,
    visibleNodeIds,
    visibleEdges,
    edgesByNode,
    highlightedNodeIds,
    highlightedEdgeIds,
    hasSelection,
    selectedNodeId,
    handleNodeClick,
    handlePaneClick,
    quickLink,
    commitQuickRelation,
    allTypes,
    edgeDraft,
    setEdgeDraft,
    editingEdgeId,
    setEditingEdgeId,
    updateExistingEdge,
    deleteExistingEdge,
    isReadOnly,
    autoLayoutRef,
  } = useRelationsMap();

  const flowNodes: Node[] = useMemo(
    () =>
      persisted.nodes.map((pn) => {
        const info = lookup.get(pn.entityId);
        const filterDimmed = !visibleNodeIds.has(pn.id);
        const highlightDimmed = hasSelection && !highlightedNodeIds.has(pn.id);
        const eds = edgesByNode.get(pn.id) ?? [];
        const changed = eds.some((e) => !!e.changedSince);
        return {
          id: pn.id,
          type: "entity",
          position: pn.position,
          data: {
            entityId: pn.entityId,
            kind: pn.type,
            name: info?.name || "Postać usunięta",
            subtitle: info?.subtitle || "",
            pinned: !!pn.pinned,
            missing: !info,
            dimmed: filterDimmed || highlightDimmed,
            highlighted: hasSelection && highlightedNodeIds.has(pn.id),
            selected: selectedNodeId === pn.id,
            changed,
          } as MapNodeData,
        };
      }),
    [
      persisted.nodes,
      lookup,
      visibleNodeIds,
      edgesByNode,
      hasSelection,
      highlightedNodeIds,
      selectedNodeId,
    ]
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      visibleEdges.map((pe) => {
        const label = pe.customType || pe.relationType;
        const color = typeColor(label);
        const markers = relationEdgeMarkers(color);
        const highlightDimmed = hasSelection && !highlightedEdgeIds.has(pe.id);
        const filterDimmed = false;
        return {
          id: pe.id,
          source: pe.source,
          target: pe.target,
          sourceHandle: pe.sourceHandle ?? undefined,
          targetHandle: pe.targetHandle ?? undefined,
          type: "relation",
          ...markers,
          data: {
            relationType: pe.relationType,
            customType: pe.customType,
            description: pe.description,
            bidirectional: pe.bidirectional,
            status: pe.status ?? "aktywna",
            strength: pe.strength ?? 3,
            changed: !!pe.changedSince,
            dimmed: filterDimmed || highlightDimmed,
            highlighted: hasSelection && highlightedEdgeIds.has(pe.id),
            label,
          } as RelationEdgeData,
        };
      }),
    [visibleEdges, hasSelection, highlightedEdgeIds]
  );

  const [nodes, setNodes] = useNodesState<Node>(flowNodes);
  const [edges, setEdges] = useEdgesState<Edge>(flowEdges);

  useEffect(() => setNodes(flowNodes), [flowNodes, setNodes]);
  useEffect(() => setEdges(flowEdges), [flowEdges, setEdges]);

  const persistNodes = useCallback(
    (ns: Node[]) => {
      if (isReadOnly) return;
      setPersisted((p) => ({
        ...p,
        nodes: ns.map((n) => {
          const existing = p.nodes.find((pn) => pn.id === n.id);
          const dd = n.data as MapNodeData;
          return {
            id: n.id,
            type: dd.kind,
            position: n.position,
            entityId: dd.entityId,
            tags: existing?.tags ?? [],
            pinned: existing?.pinned ?? false,
            meta: existing?.meta ?? {},
          };
        }),
      }));
    },
    [setPersisted, isReadOnly]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isReadOnly) return;
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        if (
          changes.some(
            (c) => c.type === "position" && "dragging" in c && c.dragging === false
          ) ||
          changes.some((c) => c.type === "remove")
        ) {
          persistNodes(next);
          if (changes.some((c) => c.type === "remove")) {
            const removedIds = new Set(
              changes
                .filter((c): c is NodeChange & { type: "remove"; id: string } => c.type === "remove")
                .map((c) => c.id)
            );
            setPersisted((p) => ({
              ...p,
              edges: p.edges.filter(
                (e) => !removedIds.has(e.source) && !removedIds.has(e.target)
              ),
            }));
          }
        }
        return next;
      });
    },
    [setNodes, persistNodes, setPersisted, isReadOnly]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isReadOnly) return;
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        if (changes.some((c) => c.type === "remove")) {
          const removed = new Set(
            changes
              .filter((c): c is EdgeChange & { type: "remove"; id: string } => c.type === "remove")
              .map((c) => c.id)
          );
          setPersisted((p) => ({
            ...p,
            edges: p.edges.filter((pe) => !removed.has(pe.id)),
          }));
        }
        return next;
      });
    },
    [setEdges, setPersisted, isReadOnly]
  );

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const payload = e.dataTransfer.getData("application/x-magnus-entity");
    if (!payload) return;
    const { entityId, kind } = JSON.parse(payload) as {
      entityId: string;
      kind: "npc" | "hero";
    };
    if (persisted.nodes.some((n) => n.entityId === entityId)) return;
    const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setPersisted((p) => ({
      ...p,
      nodes: [
        ...p.nodes,
        {
          id: `${kind}_${entityId}`,
          type: kind,
          position: pos,
          entityId,
          tags: [],
          pinned: false,
          meta: {},
        },
      ],
    }));
  };

  useEffect(() => {
    autoLayoutRef.current = () => {
      setPersisted((p) => {
        const groups = new Map<string, typeof p.nodes>();
        p.nodes.forEach((n) => {
          const key = n.tags?.[0] || "_inne";
          const arr = groups.get(key) ?? [];
          arr.push(n);
          groups.set(key, arr);
        });
        const cols = 4;
        const colW = 220;
        const rowH = 120;
        const groupGap = 80;
        let cursorY = 80;
        const updated: typeof p.nodes = [];
        Array.from(groups.entries()).forEach(([, groupNodes]) => {
          const rows = Math.ceil(groupNodes.length / cols);
          groupNodes.forEach((n, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            updated.push({
              ...n,
              position: { x: 80 + c * colW, y: cursorY + r * rowH },
            });
          });
          cursorY += rows * rowH + groupGap;
        });
        return { ...p, nodes: updated };
      });
      setTimeout(() => rf.fitView({ padding: 0.2 }), 50);
    };
  }, [autoLayoutRef, rf, setPersisted]);

  const sourceNode = quickLink.sourceNodeId
    ? persisted.nodes.find((n) => n.id === quickLink.sourceNodeId)
    : null;
  const targetNode = quickLink.targetNodeId
    ? persisted.nodes.find((n) => n.id === quickLink.targetNodeId)
    : null;
  const sourceName = sourceNode ? lookup.get(sourceNode.entityId)?.name ?? "?" : "?";
  const targetName = targetNode ? lookup.get(targetNode.entityId)?.name ?? "?" : "?";

  return (
    <div className="flex-1 relative min-w-0 min-h-0" onDragOver={onDragOver} onDrop={onDrop}>
      <MapToolbar onAutoLayout={() => autoLayoutRef.current?.()} />
      <FloatingPanels />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => handleNodeClick(node.id)}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        minZoom={0.12}
        maxZoom={2.5}
        nodesDraggable={!isReadOnly}
        nodesConnectable={false}
        elementsSelectable
        style={{ background: "hsl(var(--background))" }}
        className="h-full w-full"
      >
        <Background variant={BackgroundVariant.Lines} gap={24} size={1} color="hsl(var(--border))" />
        <Background variant={BackgroundVariant.Dots} gap={120} size={1.5} color="hsl(var(--border))" />
        <Controls className="!bg-card/80 !border-border [&_button]:!bg-card [&_button]:!border-border [&_button]:!text-foreground" />
        <MiniMap
          className="!w-[120px] !h-[80px] !opacity-60 !bg-card/70 !border !border-border/60 !bottom-2 !right-2"
          nodeColor={(n) =>
            (n.data as MapNodeData)?.pinned
              ? "hsl(var(--primary))"
              : "hsl(var(--muted-foreground))"
          }
          maskColor="hsl(var(--background) / 0.75)"
          pannable
          zoomable
        />
      </ReactFlow>

      <QuickRelationPicker
        open={quickLink.pickerOpen}
        onOpenChange={(o) => {
          if (!o) quickLink.cancelLink();
          else quickLink.setPickerOpen(true);
        }}
        sourceName={sourceName}
        targetName={targetName}
        customTypes={persisted.customRelationTypes}
        onPick={commitQuickRelation}
      />

      <RelationEditDialog
        open={!!editingEdgeId}
        onOpenChange={(o) => !o && setEditingEdgeId(null)}
        title="Edytuj relację"
        draft={edgeDraft}
        setDraft={setEdgeDraft}
        allTypes={allTypes}
        onSave={() => updateExistingEdge()}
        onDelete={deleteExistingEdge}
        canDelete
      />
    </div>
  );
}

export function RelationsMapCanvas() {
  return <FlowCanvasInner />;
}
