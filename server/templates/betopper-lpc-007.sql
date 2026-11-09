INSERT INTO v2.fixture_templates
  (name, manufacturer, model, type, channels, modes, properties, import_type, raw_source, created_at, updated_at)
VALUES (
  'LPC-007',
  'Betopper',
  'LPC-007',
  'par',                                   -- QLC+ "Color Changer"
  '[
    {"id": "c1", "name": "Master Dimmer", "defaultValue": 0, "type": "masterDimmer", "role": "COARSE",
      "preset": {"type": "masterDimmer"},
      "capabilities": [{"from": 0, "to": 255, "description": "Intensity"}] },
    {"id": "c2", "name": "Red", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c3", "name": "Green", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c4", "name": "Blue", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c5", "name": "Strobe", "defaultValue": 0, "type": "shutter", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 0, "description": "No Function"},
        {"from": 1, "to": 255, "description": "Slow to Fast"} ] },
    {"id": "c6", "name": "Color Macro", "defaultValue": 0, "type": "colourWheel", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 50, "description": "DMX Dimming"},
        {"from": 51, "to": 100, "description": "Color Output (8 type)"},
        {"from": 101, "to": 150, "description": "Color Shade"},
        {"from": 151, "to": 200, "description": "Color Transform"},
        {"from": 201, "to": 250, "description": "Color Pulse"},
        {"from": 251, "to": 255, "description": "Sound Trigger"} ] },
    {"id": "c7", "name": "Selector for Channel 6", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 30, "description": "Red"},
        {"from": 31, "to": 60, "description": "Green"},
        {"from": 61, "to": 92, "description": "Blue"},
        {"from": 93, "to": 123, "description": "White"},
        {"from": 124, "to": 154, "description": "Yellow"},
        {"from": 155, "to": 185, "description": "Violet"},
        {"from": 186, "to": 216, "description": "Color Change"},
        {"from": 217, "to": 247, "description": "White 2"},
        {"from": 248, "to": 255, "description": "Color Change 2"} ] }
  ]'::jsonb,
  '[
    {"id": "m1", "name": "3 Channel", "channelIds": ["c2", "c3", "c4"], "heads": []},
    {"id": "m2", "name": "7 Channel", "channelIds": ["c1", "c2", "c3", "c4", "c5", "c6", "c7"], "heads": [{"name": "Head 1", "channelIndexes": [0, 1, 2, 3, 4, 5, 6]}]}
  ]'::jsonb,
  '{"columns": 1, "rows": 1, "maxPan": 0, "maxTilt": 0, "minBeamAngle": 26, "maxBeamAngle": 26, "brightnessModifier": 100}'::jsonb,
  'qlcplus',
  $qxf$<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE FixtureDefinition>
<FixtureDefinition xmlns="http://www.qlcplus.org/FixtureDefinition">
 <Creator>
  <Name>Q Light Controller Plus</Name>
  <Version>5.2.2</Version>
  <Author>Romil Barticulo</Author>
 </Creator>
 <Manufacturer>Betopper</Manufacturer>
 <Model>LPC-007</Model>
 <Type>Color Changer</Type>
 <Channel Name="Master Dimmer" Preset="IntensityMasterDimmer"/>
 <Channel Name="Red" Preset="IntensityRed"/>
 <Channel Name="Green" Preset="IntensityGreen"/>
 <Channel Name="Blue" Preset="IntensityBlue"/>
 <Channel Name="Strobe">
  <Group Byte="0">Shutter</Group>
  <Capability Min="0" Max="0" Preset="ShutterOpen">No Function</Capability>
  <Capability Min="1" Max="255" Preset="StrobeSlowToFast">Slow to Fast</Capability>
 </Channel>
 <Channel Name="Color Macro">
  <Group Byte="0">Colour</Group>
  <Capability Min="0" Max="50">DMX Dimming</Capability>
  <Capability Min="51" Max="100">Color Output (8 type)</Capability>
  <Capability Min="101" Max="150">Color Shade</Capability>
  <Capability Min="151" Max="200">Color Transform</Capability>
  <Capability Min="201" Max="250">Color Pulse</Capability>
  <Capability Min="251" Max="255">Sound Trigger</Capability>
 </Channel>
 <Channel Name="Selector for Channel 6">
  <Group Byte="0">Speed</Group>
  <Capability Min="0" Max="30">Red</Capability>
  <Capability Min="31" Max="60">Green</Capability>
  <Capability Min="61" Max="92">Blue</Capability>
  <Capability Min="93" Max="123">White</Capability>
  <Capability Min="124" Max="154">Yellow</Capability>
  <Capability Min="155" Max="185">Violet</Capability>
  <Capability Min="186" Max="216">Color Change</Capability>
  <Capability Min="217" Max="247">White 2</Capability>
  <Capability Min="248" Max="255">Color Change 2</Capability>
 </Channel>
 <Mode Name="3 Channel">
  <Channel Number="0">Red</Channel>
  <Channel Number="1">Green</Channel>
  <Channel Number="2">Blue</Channel>
 </Mode>
 <Mode Name="7 Channel">
  <Channel Number="0">Master Dimmer</Channel>
  <Channel Number="1">Red</Channel>
  <Channel Number="2">Green</Channel>
  <Channel Number="3">Blue</Channel>
  <Channel Number="4">Strobe</Channel>
  <Channel Number="5">Color Macro</Channel>
  <Channel Number="6">Selector for Channel 6</Channel>
  <Head>
   <Channel>0</Channel>
   <Channel>1</Channel>
   <Channel>2</Channel>
   <Channel>3</Channel>
   <Channel>4</Channel>
   <Channel>5</Channel>
   <Channel>6</Channel>
  </Head>
 </Mode>
 <Physical>
  <Bulb Type="LED" Lumens="0" ColourTemperature="0"/>
  <Dimensions Weight="2.1" Width="235" Height="235" Depth="295"/>
  <Lens Name="Other" DegreesMin="26" DegreesMax="26"/>
  <Focus Type="Fixed" PanMax="0" TiltMax="0"/>
  <Technical PowerConsumption="180" DmxConnector="Other"/>
 </Physical>
</FixtureDefinition>
$qxf$,
  now(), now()
);
