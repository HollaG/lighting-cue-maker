INSERT INTO v2.fixture_templates
  (name, manufacturer, model, type, channels, modes, properties, import_type, raw_source, created_at, updated_at)
SELECT
  'FC-120B',
  'Nanlite',
  'FC-120B',
  'par',                                   -- QLC+ "Color Changer"
  '[
    {"id": "c1", "name": "Dimmer", "defaultValue": 0, "type": "masterDimmer", "role": "COARSE",
      "preset": {"type": "masterDimmer"},
      "capabilities": [{"from": 0, "to": 255, "description": "Intensity"}] },
    {"id": "c2", "name": "CCT", "defaultValue": 0, "type": "colourWheel", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 84, "description": "2700K"},
        {"from": 85, "to": 169, "description": "4000K"},
        {"from": 170, "to": 255, "description": "5600K"} ] },
    {"id": "c3", "name": "Maintenance", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Nothing"}] },
    {"id": "c4", "name": "Strobe", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 3, "description": "Off"},
        {"from": 4, "to": 4, "description": "Random Fast"},
        {"from": 5, "to": 5, "description": "Random Medium"},
        {"from": 6, "to": 6, "description": "Random Slow"},
        {"from": 7, "to": 255, "description": "Variable Strobe 0.4Hz --> 25hz"} ] }
  ]'::jsonb,
  '[
    {"id": "m1", "name": "CCT 8bit", "channelIds": ["c1", "c2", "c3", "c4"], "heads": [{"name": "Head 1", "channelIndexes": [0, 1, 2, 3]}]}
  ]'::jsonb,
  '{"columns": 1, "rows": 1, "maxPan": 0, "maxTilt": 0, "minBeamAngle": 10, "maxBeamAngle": 45, "brightnessModifier": 100}'::jsonb,
  'qlcplus',
  $qxf$<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE FixtureDefinition>
<FixtureDefinition xmlns="http://www.qlcplus.org/FixtureDefinition">
 <Creator>
  <Name>Q Light Controller Plus</Name>
  <Version>5.2.2</Version>
  <Author>marcus</Author>
 </Creator>
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
  <Capability Min="4" Max="4" Preset="StrobeRandom">Random Fast</Capability>
  <Capability Min="5" Max="5" Preset="StrobeRandom">Random Medium</Capability>
  <Capability Min="6" Max="6" Preset="StrobeRandom">Random Slow</Capability>
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
  <Bulb Type="LED" Lumens="0" ColourTemperature="0"/>
  <Dimensions Weight="0" Width="193" Height="198" Depth="114"/>
  <Lens Name="Fresnel" DegreesMin="45" DegreesMax="10"/>
  <Focus Type="Fixed" PanMax="0" TiltMax="0"/>
  <Technical PowerConsumption="0" DmxConnector="5-pin"/>
 </Physical>
</FixtureDefinition>
$qxf$,
  now(), now()
-- Only if the library doesn't have it yet. Soft-deleted rows count too, so a removed template stays removed.
WHERE NOT EXISTS (
  SELECT 1 FROM v2.fixture_templates WHERE manufacturer = 'Nanlite' AND model = 'FC-120B'
);
