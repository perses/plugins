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

import { IconButton, Tooltip, useTheme } from '@mui/material';
import FitToPageOutline from 'mdi-material-ui/FitToPageOutline';
import MagnifyMinusOutline from 'mdi-material-ui/MagnifyMinusOutline';
import MagnifyPlusOutline from 'mdi-material-ui/MagnifyPlusOutline';
import Restore from 'mdi-material-ui/Restore';
import type { CSSProperties, MouseEvent, ReactElement } from 'react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/**
 * On-screen zoom controls for the read-only display panel, mounted as an absolutely-positioned HTML
 * overlay over the SVG. Zoom via ctrl/meta + wheel is not discoverable, so these buttons expose
 * zoom-in/out, fit-to-view, and reset directly.
 *
 * Positioning uses inline styles rather than MUI `sx` so the overlay can't be dropped by an
 * emotion-cache mismatch inside the panel host, and a high `zIndex` keeps it above the SVG.
 */
export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  canZoomIn,
  canZoomOut,
}: ZoomControlsProps): ReactElement {
  const theme = useTheme();

  const containerStyle: CSSProperties = {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  };

  return (
    // Swallow double-clicks so using the buttons can't also trigger the panel's dbl-click fit/reset.
    <div style={containerStyle} onDoubleClick={(e: MouseEvent) => e.stopPropagation()}>
      {/* The <span> wrappers let the tooltip show while the button is disabled. */}
      <Tooltip title="Zoom in" placement="left">
        <span>
          <IconButton size="small" aria-label="Zoom in" disabled={!canZoomIn} onClick={onZoomIn}>
            <MagnifyPlusOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Zoom out" placement="left">
        <span>
          <IconButton size="small" aria-label="Zoom out" disabled={!canZoomOut} onClick={onZoomOut}>
            <MagnifyMinusOutline fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Fit to view" placement="left">
        <IconButton size="small" aria-label="Fit to view" onClick={onFit}>
          <FitToPageOutline fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Reset zoom" placement="left">
        <IconButton size="small" aria-label="Reset zoom" onClick={onReset}>
          <Restore fontSize="small" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
