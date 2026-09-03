// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { SelectChangeEvent } from '@mui/material';
import { Box, Button, FormControl, InputLabel, ListSubheader, MenuItem, Select } from '@mui/material';
import type { ReactElement } from 'react';
import { useCallback, useMemo, useRef } from 'react';

import { useEditorContext } from '../../contexts/EditorContext';
import { useSpecContext } from '../../contexts/SpecContext';
import { ZoomProvider } from '../../contexts/ZoomContext';
import { useZoom } from '../../hooks/useZoom';
import { BackgroundPropertiesPanel } from './BackgroundPropertiesPanel';
import { EdgePropertiesPanel } from './EdgePropertiesPanel';
import { EditorCanvas } from './EditorCanvas';
import { NodePropertiesPanel } from './NodePropertiesPanel';

const CANVAS_HEIGHT = 400;
const PROPERTIES_HEIGHT = 700;
const DEFAULT_BACKGROUND_WIDTH = 200;
const DEFAULT_BACKGROUND_HEIGHT = 150;

export function EditorItemsPanel(): ReactElement {
  const {
    spec,
    nodeById,
    edgeById,
    backgroundById,
    addNode,
    addBackground,
    deleteSelected,
    onNodePropertiesChange,
    onEdgePropertiesChange,
    onBackgroundPropertiesChange,
  } = useSpecContext();
  const {
    state: { selectedIds },
    selectItems,
  } = useEditorContext();
  const { svgRef, toCanvasPoint, transform, fitView, resetPan } = useZoom();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [firstSelectedId] = selectedIds;
  const selectedNode = selectedIds.size === 1 && firstSelectedId ? (nodeById.get(firstSelectedId) ?? null) : null;
  const selectedEdge = selectedIds.size === 1 && firstSelectedId ? (edgeById.get(firstSelectedId) ?? null) : null;
  const selectedBackground =
    selectedIds.size === 1 && firstSelectedId ? (backgroundById.get(firstSelectedId) ?? null) : null;

  const onAddNode = useCallback((): void => {
    const canvasWidth = containerRef.current?.clientWidth ?? 0;
    const cx = transform.invertX(canvasWidth / 2);
    const cy = transform.invertY(CANVAS_HEIGHT / 2);
    addNode({ x: cx, y: cy });
  }, [transform, addNode]);

  const onAddBackground = useCallback((): void => {
    const canvasWidth = containerRef.current?.clientWidth ?? 0;
    const k = transform.k > 0 ? transform.k : 1;
    const width = canvasWidth > 0 ? canvasWidth / k : DEFAULT_BACKGROUND_WIDTH;
    const height = CANVAS_HEIGHT > 0 ? CANVAS_HEIGHT / k : DEFAULT_BACKGROUND_HEIGHT;
    const x = transform.invertX(0);
    const y = transform.invertY(0);
    addBackground({ x, y }, width, height);
  }, [transform, addBackground]);

  const onItemSelect = useCallback(
    (event: SelectChangeEvent): void => {
      const id = event.target.value;
      selectItems(id ? new Set([id]) : new Set());
    },
    [selectItems],
  );

  const hasBackgrounds = !!spec.backgrounds?.length;
  const hasNodes = !!spec.nodes?.length;
  const hasEdges = !!spec.edges?.length;
  const specNodes = useMemo(() => spec.nodes ?? [], [spec.nodes]);

  const zoomValue = useMemo(
    () => ({ toCanvasPoint, transform, fitView, resetPan }),
    [toCanvasPoint, transform, fitView, resetPan],
  );

  const canvasWidth = containerRef.current?.clientWidth ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box ref={containerRef}>
        <ZoomProvider value={zoomValue}>
          <EditorCanvas svgRef={svgRef} width={canvasWidth} height={CANVAS_HEIGHT} />
        </ZoomProvider>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 0, flex: 1 }}>
          <InputLabel>Item</InputLabel>
          <Select
            label="Item"
            value={selectedNode?.id ?? selectedEdge?.id ?? selectedBackground?.id ?? ''}
            MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
            onChange={onItemSelect}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {hasBackgrounds ? <ListSubheader>Backgrounds</ListSubheader> : null}
            {spec.backgrounds?.map((bg) => (
              <MenuItem key={bg.id} value={bg.id}>
                {bg.name ?? bg.id}
              </MenuItem>
            ))}
            {hasNodes ? <ListSubheader>Nodes</ListSubheader> : null}
            {spec.nodes?.map((n) => (
              <MenuItem key={n.id} value={n.id}>
                {n.label ?? n.id}
              </MenuItem>
            ))}
            {hasEdges ? <ListSubheader>Edges</ListSubheader> : null}
            {spec.edges?.map((ed) => (
              <MenuItem key={ed.id} value={ed.id}>
                {ed.name ?? ed.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" size="small" sx={{ whiteSpace: 'nowrap' }} onClick={onAddNode}>
          Add node
        </Button>
        <Button variant="outlined" size="small" sx={{ whiteSpace: 'nowrap' }} onClick={onAddBackground}>
          Add background
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          disabled={selectedIds.size === 0}
          onClick={deleteSelected}
        >
          Delete
        </Button>
      </Box>

      <Box sx={{ height: PROPERTIES_HEIGHT, overflowY: 'auto' }}>
        {selectedNode ? <NodePropertiesPanel node={selectedNode} onChange={onNodePropertiesChange} /> : null}
        {selectedEdge ? (
          <EdgePropertiesPanel edge={selectedEdge} nodes={specNodes} onChange={onEdgePropertiesChange} />
        ) : null}
        {selectedBackground ? (
          <BackgroundPropertiesPanel background={selectedBackground} onChange={onBackgroundPropertiesChange} />
        ) : null}
        {!selectedNode && !selectedEdge && !selectedBackground ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
            }}
          >
            Select a node or edge to edit its properties
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
