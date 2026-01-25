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
import { createRoot } from 'react-dom/client';
import { getPluginModule } from './getPluginModule';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>🗄️ SQL Plugin</h1>
      <p>Generic SQL datasource plugin for Perses</p>
      <h3>Supported databases:</h3>
      <ul>
        <li>PostgreSQL (with TimescaleDB)</li>
        <li>MySQL</li>
        <li>MariaDB</li>
      </ul>
      <h3>Features:</h3>
      <ul>
        <li>Time Series Queries</li>
        <li>SQL Macros ($__timeFrom, $__timeTo, $__timeFilter)</li>
        <li>Builtin Variables ($__interval)</li>
        <li>SSL/TLS Support</li>
      </ul>
      <p style={{ marginTop: '2rem', color: '#666' }}>Plugin loaded successfully! Ready for development.</p>
    </div>
  );
}

// Make plugin module available
(window as any).getPluginModule = getPluginModule;
