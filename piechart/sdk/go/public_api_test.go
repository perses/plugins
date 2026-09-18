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

package pie_test

import (
	"encoding/json"
	"testing"

	"github.com/perses/perses/go-sdk/common"
	pie "github.com/perses/plugins/piechart/sdk/go"
)

func TestVisualRadiiAreUsableThroughThePublicSDK(t *testing.T) {
	spec := pie.PluginSpec{
		Calculation: common.LastCalculation,
		ShowLabels:  true,
		Visual: &pie.Visual{
			InnerRadius: "40%",
			OuterRadius: "90%",
		},
	}

	bytes, err := json.Marshal(spec)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	if string(bytes) != `{"calculation":"last","showLabels":true,"visual":{"innerRadius":"40%","outerRadius":"90%"}}` {
		t.Errorf("unexpected JSON: %s", bytes)
	}
}

func TestLegacyVisualAPIStillCompiles(t *testing.T) {
	visual := pie.Visual{
		Display:      pie.LineDisplay,
		LineWidth:    2,
		AreaOpacity:  0.5,
		ShowPoints:   pie.AutoShowPoints,
		Palette:      pie.Palette{Mode: pie.AutoMode},
		PointRadius:  3,
		Stack:        pie.AllStack,
		ConnectNulls: true,
	}
	querySettings := []pie.QuerySettingsItem{{
		QueryIndex: 0,
		ColorMode:  pie.FixedMode,
		ColorValue: "#3366cc",
	}}
	legacySpec := pie.PluginSpec{Radius: 50, Visual: &visual, QuerySettings: &querySettings}

	if legacySpec.Visual == nil || pie.WithVisual(visual) == nil || pie.WithQuerySettings(querySettings) == nil {
		t.Fatal("expected legacy options to remain usable")
	}
}
