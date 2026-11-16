package main

import (
	"reflect"
	"strings"
	"testing"
)

// The Nanlite FC-120B, which also has a hand-written seed (templates/nanlite-fc-120b.sql): the converter should
// produce the same template.
const nanlite = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE FixtureDefinition>
<FixtureDefinition xmlns="http://www.qlcplus.org/FixtureDefinition">
 <Manufacturer>Nanlite</Manufacturer>
 <Model>FC-120B</Model>
 <Type>Color Changer</Type>
 <Channel Name="Dimmer" Preset="IntensityMasterDimmer"/>
 <Channel Name="CCT">
  <Group Byte="0">Colour</Group>
  <Capability Min="0" Max="84" Preset="ColorMacro" Res1="#ffc266">2700K</Capability>
  <Capability Min="85" Max="169" Preset="ColorMacro" Res1="#ffddbd">4000K</Capability>
  <Capability Min="170" Max="255" Preset="ColorMacro" Res1="#ffffff">5600K</Capability>
 </Channel>
 <Channel Name="Maintenance">
  <Group Byte="0">Nothing</Group>
  <Capability Min="0" Max="255">Nothing</Capability>
 </Channel>
 <Channel Name="Strobe">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="3" Preset="ShutterOpen">Off</Capability>
  <Capability Min="7" Max="255" Preset="StrobeSlowToFast">Variable Strobe 0.4Hz --&gt; 25hz</Capability>
 </Channel>
 <Mode Name="CCT 8bit">
  <Channel Number="0">Dimmer</Channel>
  <Channel Number="1">CCT</Channel>
  <Channel Number="2">Maintenance</Channel>
  <Channel Number="3">Strobe</Channel>
  <Head>
   <Channel>0</Channel>
   <Channel>1</Channel>
   <Channel>2</Channel>
   <Channel>3</Channel>
  </Head>
 </Mode>
 <Physical>
  <Dimensions Weight="0" Width="193" Height="198" Depth="114"/>
  <Lens Name="Fresnel" DegreesMin="45" DegreesMax="10"/>
  <Focus Type="Fixed" PanMax="0" TiltMax="0"/>
 </Physical>
</FixtureDefinition>`

func TestConvertMatchesTheHandWrittenSeed(t *testing.T) {
	tpl, warnings, err := convert([]byte(nanlite))
	if err != nil {
		t.Fatal(err)
	}
	if len(warnings) != 0 {
		t.Errorf("unexpected warnings: %v", warnings)
	}
	if tpl.Type != "par" {
		t.Errorf("type = %q, want par", tpl.Type)
	}

	want := []channel{
		{Id: "c1", Name: "Dimmer", Type: "masterDimmer", Role: "COARSE", Preset: preset{Type: "masterDimmer"},
			Capabilities: []capability{{0, 255, "Intensity"}}},
		{Id: "c2", Name: "CCT", Type: "colourWheel", Role: "COARSE",
			Capabilities: []capability{{0, 84, "2700K"}, {85, 169, "4000K"}, {170, 255, "5600K"}}},
		{Id: "c3", Name: "Maintenance", Type: "custom", Role: "COARSE", Capabilities: []capability{{0, 255, "Nothing"}}},
		{Id: "c4", Name: "Strobe", Type: "custom", Role: "COARSE",
			Capabilities: []capability{{0, 3, "Off"}, {7, 255, "Variable Strobe 0.4Hz --> 25hz"}}},
	}
	if !reflect.DeepEqual(tpl.Channels, want) {
		t.Errorf("channels =\n%+v\nwant\n%+v", tpl.Channels, want)
	}

	wantModes := []mode{{Id: "m1", Name: "CCT 8bit", ChannelIds: []string{"c1", "c2", "c3", "c4"},
		Heads: []head{{Name: "Head 1", ChannelIndexes: []int{0, 1, 2, 3}}}}}
	if !reflect.DeepEqual(tpl.Modes, wantModes) {
		t.Errorf("modes = %+v, want %+v", tpl.Modes, wantModes)
	}

	// Lens degrees come swapped in the file. The hand-written seed predates dimensions, so these three are new.
	wantProps := properties{Columns: 1, Rows: 1, MinBeamAngle: 10, MaxBeamAngle: 45, BrightnessModifier: 100,
		Width: 193, Height: 198, Depth: 114}
	if tpl.Properties != wantProps {
		t.Errorf("properties = %+v, want %+v", tpl.Properties, wantProps)
	}
}

func TestRenderIsASafeSeed(t *testing.T) {
	tpl, _, err := convert([]byte(strings.Replace(nanlite, "<Model>FC-120B</Model>", "<Model>Bob's Bar</Model>", 1)))
	if err != nil {
		t.Fatal(err)
	}
	sql, err := render(tpl, "test.qxf")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"WHERE NOT EXISTS", "model = 'Bob''s Bar'", "$qxf$<?xml", "'qlcplus'"} {
		if !strings.Contains(sql, want) {
			t.Errorf("SQL is missing %q", want)
		}
	}
	if got := fileName(tpl); got != "nanlite-bob-s-bar.sql" {
		t.Errorf("fileName = %q", got)
	}
}

func TestModeWithUnknownChannelFails(t *testing.T) {
	// The mistake the China bar had: the mode names a channel that isn't defined.
	broken := strings.Replace(nanlite, `<Channel Number="3">Strobe</Channel>`, `<Channel Number="3">White 1</Channel>`, 1)
	if _, _, err := convert([]byte(broken)); err == nil || !strings.Contains(err.Error(), `"White 1"`) {
		t.Errorf("err = %v, want one naming the missing channel", err)
	}
}

func TestIntensityGroupOutsideHeadsIsMasterDimmer(t *testing.T) {
	const bar = `<FixtureDefinition>
 <Manufacturer>X</Manufacturer><Model>Y</Model><Type>LED Bar (Beams)</Type>
 <Channel Name="Dim"><Group Byte="0">Intensity</Group></Channel>
 <Channel Name="R1"><Group Byte="0">Intensity</Group><Colour>Red</Colour></Channel>
 <Channel Name="R2"><Group Byte="0">Intensity</Group><Colour>Red</Colour></Channel>
 <Mode Name="3ch">
  <Channel Number="0">Dim</Channel><Channel Number="1">R1</Channel><Channel Number="2">R2</Channel>
  <Head><Channel>1</Channel></Head><Head><Channel>2</Channel></Head>
 </Mode>
</FixtureDefinition>`
	tpl, _, err := convert([]byte(bar))
	if err != nil {
		t.Fatal(err)
	}
	if got := tpl.Channels[0].Type; got != "masterDimmer" {
		t.Errorf("Dim type = %q, want masterDimmer", got)
	}
	if got := tpl.Channels[1].Type; got != "red" {
		t.Errorf("R1 type = %q, want red", got)
	}
}
