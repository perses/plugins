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

import React from 'react';

interface LogTimestampProps {
  timestamp: number | string;
}

const dateFromStr = (timestamp: string): Date => {
  return /^\d+$/.test(timestamp) ? new Date(parseInt(timestamp) * 1000) : new Date(Date.parse(timestamp));
};

export const LogTimestamp: React.FC<LogTimestampProps> = ({ timestamp }) => {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : dateFromStr(timestamp);
  return (
    <time
      style={{
        fontSize: '12px',
        whiteSpace: 'nowrap',
        minWidth: 'max-content',
      }}
      dateTime={date.toISOString()}
    >
      {date.toISOString()}
    </time>
  );
};
