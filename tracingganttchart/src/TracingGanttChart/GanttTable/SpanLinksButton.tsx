// Copyright 2025 The Perses Authors
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

import { IconButton, Menu, MenuItem } from '@mui/material';
import { MouseEvent, useState } from 'react';
import LaunchIcon from 'mdi-material-ui/Launch';
import { InfoTooltip } from '@perses-dev/components';
import { useAllVariableValues, useRouterContext } from '@perses-dev/plugin-system';
import { Span } from '../trace';
import { CustomLinks } from '../../gantt-chart-model';
import { renderTemplate } from '../utils';

export interface SpanLinksButtonProps {
  customLinks: CustomLinks;
  span: Span;
}

export function SpanLinksButton(props: SpanLinksButtonProps) {
  const { customLinks, span } = props;
  const variableValues = useAllVariableValues();
  const { RouterComponent } = useRouterContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  if (!RouterComponent || !customLinks.links.trace) {
    return;
  }

  // if there is a single span link, render the button directly without a menu
  if (span.links.length == 1 && span.links[0]) {
    const link = span.links[0];
    return (
      <InfoTooltip description="open linked span">
        <IconButton
          size="small"
          component={RouterComponent}
          to={
            renderTemplate(customLinks.links.trace, variableValues, {
              ...customLinks.variables,
              traceId: link.traceId,
              spanId: link.spanId,
            }) as string
          }
        >
          <LaunchIcon fontSize="inherit" />
        </IconButton>
      </InfoTooltip>
    );
  }

  const handleOpenMenu = (event: MouseEvent<HTMLButtonElement>) => {
    // do not propagate onClick event to the table row (otherwise, the detail pane would open)
    event.stopPropagation();

    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event: MouseEvent) => {
    // Closing the menu, i.e. clicking on the fullscreen transparent MUI backdrop element, does trigger a click on the table row (which opens the detail pane).
    // Therefore, stop propagating this event
    event.stopPropagation();

    setAnchorEl(null);
  };

  return (
    <>
      <InfoTooltip description={`${span.links.length} linked spans`}>
        <IconButton
          aria-label="span links"
          aria-haspopup="true"
          aria-expanded={isOpen ? 'true' : undefined}
          size="small"
          onClick={handleOpenMenu}
        >
          <LaunchIcon fontSize="inherit" />
        </IconButton>
      </InfoTooltip>
      <Menu anchorEl={anchorEl} open={isOpen} onClose={handleClose}>
        {span.links.map((link) => (
          <MenuItem
            key={link.spanId}
            component={RouterComponent}
            onClick={handleClose}
            to={
              renderTemplate(customLinks.links.trace, variableValues, {
                ...customLinks.variables,
                traceId: link.traceId,
                spanId: link.spanId,
              }) as string
            }
          >
            Open linked span {link.spanId}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
