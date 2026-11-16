package main

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"
)

// --- The .qxf file (only the parts we read) ---
// Tags have no namespace, so they match the file's default QLC+ namespace.

type qxfFixture struct {
	Manufacturer string       `xml:"Manufacturer"`
	Model        string       `xml:"Model"`
	Type         string       `xml:"Type"`
	Channels     []qxfChannel `xml:"Channel"`
	Modes        []qxfMode    `xml:"Mode"`
	Physical     qxfPhysical  `xml:"Physical"`
}

type qxfChannel struct {
	Name         string          `xml:"Name,attr"`
	Preset       string          `xml:"Preset,attr"`
	Default      int             `xml:"Default,attr"`
	Group        *qxfGroup       `xml:"Group"`
	Colour       string          `xml:"Colour"`
	Capabilities []qxfCapability `xml:"Capability"`
}

type qxfGroup struct {
	Byte  int    `xml:"Byte,attr"`
	Value string `xml:",chardata"`
}

type qxfCapability struct {
	Min  int    `xml:"Min,attr"`
	Max  int    `xml:"Max,attr"`
	Text string `xml:",chardata"`
}

type qxfMode struct {
	Name     string `xml:"Name,attr"`
	Channels []struct {
		Number int    `xml:"Number,attr"`
		Name   string `xml:",chardata"`
	} `xml:"Channel"`
	Heads []struct {
		Channels []int `xml:"Channel"`
	} `xml:"Head"`
}

type qxfPhysical struct {
	Dimensions struct {
		Width  int `xml:"Width,attr"`
		Height int `xml:"Height,attr"`
		Depth  int `xml:"Depth,attr"`
	} `xml:"Dimensions"`
	Lens struct {
		DegreesMin float64 `xml:"DegreesMin,attr"`
		DegreesMax float64 `xml:"DegreesMax,attr"`
	} `xml:"Lens"`
	Focus struct {
		PanMax  int `xml:"PanMax,attr"`
		TiltMax int `xml:"TiltMax,attr"`
	} `xml:"Focus"`
	Layout struct {
		Width  int `xml:"Width,attr"`
		Height int `xml:"Height,attr"`
	} `xml:"Layout"`
}

// --- The CueSketch template (website/src/types-v2/fixtureTemplates.ts) ---
// Field order matches the existing seeds, so generated files read the same.

type template struct {
	Name         string
	Manufacturer string
	Model        string
	Type         string
	QlcType      string // for the comment next to Type
	Channels     []channel
	Modes        []mode
	Properties   properties
	RawSource    string
}

type channel struct {
	Id           string       `json:"id"`
	Name         string       `json:"name"`
	DefaultValue int          `json:"defaultValue"`
	Type         string       `json:"type"`
	Role         string       `json:"role"`
	Preset       preset       `json:"preset"`
	Capabilities []capability `json:"capabilities"`
	Reversed     bool         `json:"reversed,omitempty"`
}

type preset struct {
	Type string `json:"type,omitempty"`
}

type capability struct {
	From        int    `json:"from"`
	To          int    `json:"to"`
	Description string `json:"description"`
}

type mode struct {
	Id         string   `json:"id"`
	Name       string   `json:"name"`
	ChannelIds []string `json:"channelIds"`
	Heads      []head   `json:"heads"`
}

type head struct {
	Name           string `json:"name"`
	ChannelIndexes []int  `json:"channelIndexes"`
}

type properties struct {
	Columns            int     `json:"columns"`
	Rows               int     `json:"rows"`
	MaxPan             int     `json:"maxPan"`
	MaxTilt            int     `json:"maxTilt"`
	MinBeamAngle       float64 `json:"minBeamAngle"`
	MaxBeamAngle       float64 `json:"maxBeamAngle"`
	BrightnessModifier int     `json:"brightnessModifier"`
	// Body size in mm. Left out when the file says 0 (QLC+'s "unknown"), so the visualiser uses its defaults.
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
	Depth  int `json:"depth,omitempty"`
}

// --- Mapping tables ---

// QLC+ fixture <Type> → FixtureType. Anything else is "custom".
var fixtureTypes = map[string]string{
	"Color Changer":    "par",
	"LED Bar (Pixels)": "bar_pixel",
	"LED Bar (Beams)":  "bar_beam",
	"Moving Head":      "moving_head",
	"Scanner":          "scanner",
}

type channelKind struct {
	Type     string
	Fine     bool
	Reversed bool
}

// Channel-level QLC+ presets → ChannelType. A preset not listed here imports as "custom" (with a warning).
var presetKinds = map[string]channelKind{
	"IntensityMasterDimmer": {Type: "masterDimmer"}, "IntensityMasterDimmerFine": {Type: "masterDimmer", Fine: true},
	"IntensityDimmer": {Type: "dimmer"}, "IntensityDimmerFine": {Type: "dimmer", Fine: true},
	"IntensityRed": {Type: "red"}, "IntensityRedFine": {Type: "red", Fine: true},
	"IntensityGreen": {Type: "green"}, "IntensityGreenFine": {Type: "green", Fine: true},
	"IntensityBlue": {Type: "blue"}, "IntensityBlueFine": {Type: "blue", Fine: true},
	"IntensityWhite": {Type: "white"}, "IntensityWhiteFine": {Type: "white", Fine: true},
	"IntensityAmber": {Type: "amber"}, "IntensityAmberFine": {Type: "amber", Fine: true},
	"IntensityUV": {Type: "uv"}, "IntensityUVFine": {Type: "uv", Fine: true},
	"IntensityLime": {Type: "lime"}, "IntensityLimeFine": {Type: "lime", Fine: true},
	"IntensityIndigo": {Type: "indigo"}, "IntensityIndigoFine": {Type: "indigo", Fine: true},
	"IntensityCyan": {Type: "cyan"}, "IntensityCyanFine": {Type: "cyan", Fine: true},
	"IntensityMagenta": {Type: "magenta"}, "IntensityMagentaFine": {Type: "magenta", Fine: true},
	"IntensityYellow": {Type: "yellow"}, "IntensityYellowFine": {Type: "yellow", Fine: true},
	"PositionPan": {Type: "pan"}, "PositionPanFine": {Type: "pan", Fine: true},
	"PositionTilt": {Type: "tilt"}, "PositionTiltFine": {Type: "tilt", Fine: true},
	"BeamZoomSmallBig": {Type: "zoom"}, "BeamZoomBigSmall": {Type: "zoom", Reversed: true},
	"BeamZoomFine":     {Type: "zoom", Fine: true},
	"BeamFocusNearFar": {Type: "focus"}, "BeamFocusFarNear": {Type: "focus", Reversed: true},
	"BeamFocusFine":         {Type: "focus", Fine: true},
	"ShutterStrobeSlowFast": {Type: "shutter"}, "ShutterStrobeFastSlow": {Type: "shutter", Reversed: true},
	"ColorMacro": {Type: "colourWheel"}, "ColorWheel": {Type: "colourWheel"},
	"GoboWheel": {Type: "gobo"},
}

// <Group> → ChannelType, for channels without a preset. Intensity is handled separately (colour or dimmer).
var groupTypes = map[string]string{
	"Colour":  "colourWheel",
	"Gobo":    "gobo",
	"Pan":     "pan",
	"Tilt":    "tilt",
	"Shutter": "shutter",
	"Prism":   "prism",
}

// <Group>Intensity</Group> + <Colour> → ChannelType.
var colourTypes = map[string]string{
	"Red": "red", "Green": "green", "Blue": "blue", "White": "white", "Amber": "amber", "UV": "uv",
	"Lime": "lime", "Indigo": "indigo", "Cyan": "cyan", "Magenta": "magenta", "Yellow": "yellow",
}

// --- Conversion ---

// convert turns a .qxf file into a CueSketch template. Warnings are things that imported, but maybe not as meant.
func convert(raw []byte) (template, []string, error) {
	var warnings []string
	var fx qxfFixture
	if err := xml.Unmarshal(raw, &fx); err != nil {
		return template{}, nil, fmt.Errorf("parse .qxf: %w", err)
	}
	if fx.Manufacturer == "" || fx.Model == "" {
		return template{}, nil, fmt.Errorf("the file has no <Manufacturer> or <Model>")
	}

	t := template{
		Name:         fx.Model,
		Manufacturer: fx.Manufacturer,
		Model:        fx.Model,
		QlcType:      fx.Type,
		RawSource:    string(raw),
	}
	t.Type = fixtureTypes[fx.Type]
	if t.Type == "" {
		t.Type = "custom"
		warnings = append(warnings, fmt.Sprintf("fixture type %q has no match: imported as \"custom\"", fx.Type))
	}

	// Channels, in file order: c1, c2, ...
	idByName := map[string]string{}
	for i, qc := range fx.Channels {
		if _, dup := idByName[qc.Name]; dup {
			return template{}, nil, fmt.Errorf("channel %q is defined twice", qc.Name)
		}
		c, warning := convertChannel(fmt.Sprintf("c%d", i+1), qc)
		if warning != "" {
			warnings = append(warnings, warning)
		}
		idByName[qc.Name] = c.Id
		t.Channels = append(t.Channels, c)
	}

	// Modes: m1, m2, ... Heads point at positions in the mode's channel list (the QLC+ channel numbers).
	for i, qm := range fx.Modes {
		slots := append(qm.Channels[:0:0], qm.Channels...)
		sort.Slice(slots, func(a, b int) bool { return slots[a].Number < slots[b].Number })

		m := mode{Id: fmt.Sprintf("m%d", i+1), Name: qm.Name, ChannelIds: []string{}, Heads: []head{}}
		for _, s := range slots {
			id, ok := idByName[strings.TrimSpace(s.Name)]
			if !ok {
				return template{}, nil, fmt.Errorf("mode %q uses channel %q, which isn't defined", qm.Name, s.Name)
			}
			m.ChannelIds = append(m.ChannelIds, id)
		}
		for h, qh := range qm.Heads {
			for _, slot := range qh.Channels {
				if slot < 0 || slot >= len(m.ChannelIds) {
					return template{}, nil, fmt.Errorf("mode %q, head %d: channel %d is outside the mode", qm.Name, h+1, slot)
				}
			}
			m.Heads = append(m.Heads, head{Name: fmt.Sprintf("Head %d", h+1), ChannelIndexes: qh.Channels})
		}
		t.Modes = append(t.Modes, m)
	}

	applyDimmerFallback(t.Channels, t.Modes, fx.Channels)

	// Physical. QLC+ files sometimes have DegreesMin > DegreesMax, so sort them.
	lens := fx.Physical.Lens
	t.Properties = properties{
		Columns:            atLeastOne(fx.Physical.Layout.Width),
		Rows:               atLeastOne(fx.Physical.Layout.Height),
		MaxPan:             fx.Physical.Focus.PanMax,
		MaxTilt:            fx.Physical.Focus.TiltMax,
		MinBeamAngle:       math.Min(lens.DegreesMin, lens.DegreesMax),
		MaxBeamAngle:       math.Max(lens.DegreesMin, lens.DegreesMax),
		BrightnessModifier: 100,
		Width:              fx.Physical.Dimensions.Width,
		Height:             fx.Physical.Dimensions.Height,
		Depth:              fx.Physical.Dimensions.Depth,
	}
	return t, warnings, nil
}

func convertChannel(id string, qc qxfChannel) (channel, string) {
	c := channel{Id: id, Name: qc.Name, DefaultValue: qc.Default, Role: "COARSE", Type: "custom"}
	warning := ""

	if qc.Preset != "" {
		kind, ok := presetKinds[qc.Preset]
		if ok {
			c.Type, c.Reversed = kind.Type, kind.Reversed
			c.Preset = preset{Type: kind.Type}
			if kind.Fine {
				c.Role = "FINE"
			}
		} else {
			warning = fmt.Sprintf("channel %q: preset %q has no match: imported as \"custom\"", qc.Name, qc.Preset)
		}
	} else if qc.Group != nil {
		group := strings.TrimSpace(qc.Group.Value)
		if qc.Group.Byte == 1 {
			c.Role = "FINE"
		}
		switch {
		case group == "Intensity" && qc.Colour != "":
			if t, ok := colourTypes[strings.TrimSpace(qc.Colour)]; ok {
				c.Type = t
			}
		case group == "Intensity":
			c.Type = "dimmer" // may become masterDimmer, see applyDimmerFallback
		default:
			if t, ok := groupTypes[group]; ok {
				c.Type = t
			}
		}
	}

	for _, qcap := range qc.Capabilities {
		c.Capabilities = append(c.Capabilities, capability{From: qcap.Min, To: qcap.Max, Description: strings.TrimSpace(qcap.Text)})
	}
	// QLC+ gives a preset channel without capabilities one 0–255 range named after the preset; so do we.
	if len(c.Capabilities) == 0 {
		c.Capabilities = []capability{{From: 0, To: 255, Description: defaultCapability(c)}}
	}
	return c, warning
}

func defaultCapability(c channel) string {
	switch c.Type {
	case "masterDimmer", "dimmer":
		return "Intensity"
	case "red", "green", "blue", "white", "amber", "lime", "indigo", "cyan", "magenta", "yellow":
		return strings.ToUpper(c.Type[:1]) + c.Type[1:] + " intensity"
	case "uv":
		return "UV intensity"
	}
	return c.Name
}

// applyDimmerFallback: a <Group>Intensity</Group> dimmer without a preset controls the whole fixture when it sits
// outside every head of a multi-head mode (see "Fixture templates and QLC+ import" in the implementation notes).
// Channels with a preset already say which dimmer they are.
func applyDimmerFallback(channels []channel, modes []mode, source []qxfChannel) {
	for i := range channels {
		if channels[i].Type != "dimmer" || source[i].Preset != "" {
			continue
		}
		for _, m := range modes {
			if len(m.Heads) < 2 {
				continue
			}
			inAHead := map[int]bool{}
			for _, h := range m.Heads {
				for _, slot := range h.ChannelIndexes {
					inAHead[slot] = true
				}
			}
			for slot, id := range m.ChannelIds {
				if id == channels[i].Id && !inAHead[slot] {
					channels[i].Type = "masterDimmer"
				}
			}
		}
	}
}

func atLeastOne(n int) int {
	if n < 1 {
		return 1
	}
	return n
}

// --- SQL ---

var nonSlug = regexp.MustCompile(`[^a-z0-9]+`)

// fileName is a suggested seed file name, e.g. "nanlite-fc-120b.sql".
func fileName(t template) string {
	return strings.Trim(nonSlug.ReplaceAllString(strings.ToLower(t.Manufacturer+" "+t.Model), "-"), "-") + ".sql"
}

// render writes the seed in the same shape as the hand-written ones: insert only if the library doesn't have this
// manufacturer + model yet (soft-deleted rows count), because the server runs every seed on every start.
func render(t template, source string) (string, error) {
	if strings.Contains(t.RawSource, "$qxf$") {
		return "", fmt.Errorf("the .qxf contains \"$qxf$\", which would end the SQL string early")
	}

	var b strings.Builder
	fmt.Fprintf(&b, "-- Generated by cmd/qxf2seed from %s. Regenerate rather than editing by hand.\n", source)
	b.WriteString("INSERT INTO v2.fixture_templates\n")
	b.WriteString("  (name, manufacturer, model, type, channels, modes, properties, import_type, raw_source, created_at, updated_at)\n")
	b.WriteString("SELECT\n")
	fmt.Fprintf(&b, "  %s,\n  %s,\n  %s,\n", sqlString(t.Name), sqlString(t.Manufacturer), sqlString(t.Model))
	fmt.Fprintf(&b, "  %-40s -- QLC+ %q\n", sqlString(t.Type)+",", t.QlcType)

	b.WriteString("  '[\n")
	for i, c := range t.Channels {
		line, err := json.Marshal(c)
		if err != nil {
			return "", err
		}
		b.WriteString("    " + escapeQuotes(string(line)) + comma(i, len(t.Channels)) + "\n")
	}
	b.WriteString("  ]'::jsonb,\n")

	b.WriteString("  '[\n")
	for i, m := range t.Modes {
		line, err := json.Marshal(m)
		if err != nil {
			return "", err
		}
		b.WriteString("    " + escapeQuotes(string(line)) + comma(i, len(t.Modes)) + "\n")
	}
	b.WriteString("  ]'::jsonb,\n")

	props, err := json.Marshal(t.Properties)
	if err != nil {
		return "", err
	}
	fmt.Fprintf(&b, "  '%s'::jsonb,\n", escapeQuotes(string(props)))
	b.WriteString("  'qlcplus',\n")
	b.WriteString("  $qxf$" + t.RawSource + "$qxf$,\n")
	b.WriteString("  now(), now()\n")
	b.WriteString("-- Only if the library doesn't have it yet. Soft-deleted rows count too, so a removed template stays removed.\n")
	b.WriteString("WHERE NOT EXISTS (\n")
	fmt.Fprintf(&b, "  SELECT 1 FROM v2.fixture_templates WHERE manufacturer = %s AND model = %s\n",
		sqlString(t.Manufacturer), sqlString(t.Model))
	b.WriteString(");\n")
	return b.String(), nil
}

func sqlString(s string) string { return "'" + escapeQuotes(s) + "'" }

func escapeQuotes(s string) string { return strings.ReplaceAll(s, "'", "''") }

func comma(i, n int) string {
	if i < n-1 {
		return ","
	}
	return ""
}
