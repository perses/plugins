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

import { useState } from 'react';
import { produce } from 'immer';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { PyroscopeProfileQuerySpec } from '../../model/profile-query-model';
import { LabelFilter } from '../../utils/types';

export type ProfileQueryEditorProps = OptionsEditorProps<PyroscopeProfileQuerySpec>;

/**
 * Hook to manage `maxNodes` state to ensure panel preview rerender when maxNodes is changed.
 */
export function useMaxNodesState(props: ProfileQueryEditorProps): {
  maxNodes: string;
  handleMaxNodesChange: (e: string) => void;
  maxNodesHasError: boolean;
} {
  const { onChange, value } = props;

  const [maxNodes, setMaxNodes] = useState(value.maxNodes ? value.maxNodes.toString() : '');
  const [lastSyncedMaxNodes, setLastSyncedMaxNodes] = useState(value.maxNodes);

  if (value.maxNodes !== lastSyncedMaxNodes) {
    setMaxNodes(value.maxNodes ? value.maxNodes.toString() : '');
    setLastSyncedMaxNodes(value.maxNodes);
  }

  // maxNodes must be empty or an integer between 0 and max_flamegraph_nodes_max (0 < maxNodes <= max_flamegraph_nodes_max)
  // what is the actual value of max_flamegraph_nodes_max?
  // todo: add a constraint to the maxNodes related to max_flamegraph_nodes_max
  const maxNodesHasError = !(maxNodes === '' || (/^[0-9]+$/.test(maxNodes) && parseInt(maxNodes) > 0));

  // Update our local state as the user types
  const handleMaxNodesChange = (e: string): void => {
    setMaxNodes(e);
    // Propagate changes to the panel immediately
    onChange(
      produce(value, (draft) => {
        draft.maxNodes = e === '' ? undefined : parseInt(e);
      })
    );
  };

  return { maxNodes, handleMaxNodesChange, maxNodesHasError };
}

/**
 * Hook to manage `profileType` state to ensure panel preview rerender when profileType is changed.
 */
export function useProfileTypeState(props: ProfileQueryEditorProps): {
  profileType: string;
  handleProfileTypeChange: (e: string) => void;
} {
  const { onChange, value } = props;

  const [profileType, setProfileType] = useState(value.profileType ? value.profileType : '');
  const [lastSyncedProfileType, setLastSyncedProfileType] = useState(value.profileType);

  if (value.profileType !== lastSyncedProfileType) {
    setProfileType(value.profileType);
    setLastSyncedProfileType(value.profileType);
  }

  // Update our local state as the user types
  const handleProfileTypeChange = (e: string): void => {
    setProfileType(e);
    // Propagate changes to the panel immediately
    onChange(
      produce(value, (draft) => {
        draft.profileType = e;
      })
    );
  };

  return { profileType, handleProfileTypeChange };
}

/**
 * Hook to manage `service` state to ensure panel preview rerender when service is changed.
 */
export function useServiceState(props: ProfileQueryEditorProps): {
  service: string;
  handleServiceChange: (e: string) => void;
} {
  const { onChange, value } = props;

  const [service, setService] = useState(value.service ? value.service : '');
  const [lastSyncedService, setLastSyncedService] = useState(value.service);

  if (value.service !== lastSyncedService) {
    setService(value.service || '');
    setLastSyncedService(value.service);
  }

  // Update our local state as the user types
  const handleServiceChange = (e: string): void => {
    setService(e);
    // Propagate changes to the panel immediately
    onChange(
      produce(value, (draft) => {
        draft.service = e;
      })
    );
  };

  return { service, handleServiceChange };
}

/**
 * Hook to manage `filters` state to ensure panel preview rerender when filters is changed.
 */
export function useFiltersState(props: ProfileQueryEditorProps): {
  filters: LabelFilter[];
  handleFiltersChange: (f: LabelFilter[]) => void;
} {
  const { onChange, value } = props;

  const [filters, setFilters] = useState(value.filters ? value.filters : []);

  const handleFiltersChange = (f: LabelFilter[]): void => {
    setFilters(f);

    onChange(
      produce(value, (draft) => {
        draft.filters = f;
      })
    );
  };

  return { filters, handleFiltersChange };
}
