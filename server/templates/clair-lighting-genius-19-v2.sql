INSERT INTO v2.fixture_templates
  (name, manufacturer, model, type, channels, modes, properties, import_type, raw_source, created_at, updated_at)
VALUES (
  'Genius 19 V2',
  'Clair Lighting',
  'Genius 19 V2',
  'moving_head',                           -- QLC+ "Moving Head"
  '[
    {"id": "c1", "name": "Strobe (Custom)", "defaultValue": 0, "type": "shutter", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Strobe stuff"}] },
    {"id": "c2", "name": "Master dimmer", "defaultValue": 0, "type": "masterDimmer", "role": "COARSE",
      "preset": {"type": "masterDimmer"},
      "capabilities": [{"from": 0, "to": 255, "description": "Intensity"}] },
    {"id": "c3", "name": "Focus/Zoom", "defaultValue": 0, "type": "zoom", "role": "COARSE", "reversed": true,
      "preset": {"type": "zoom"},
      "capabilities": [{"from": 0, "to": 255, "description": "Zoom (big to small)"}] },
    {"id": "c4", "name": "Pan", "defaultValue": 0, "type": "pan", "role": "COARSE",
      "preset": {"type": "pan"},
      "capabilities": [{"from": 0, "to": 255, "description": "Pan"}] },
    {"id": "c5", "name": "Pan fine", "defaultValue": 0, "type": "pan", "role": "FINE",
      "preset": {"type": "pan"},
      "capabilities": [{"from": 0, "to": 255, "description": "Fine pan"}] },
    {"id": "c6", "name": "Tilt", "defaultValue": 0, "type": "tilt", "role": "COARSE",
      "preset": {"type": "tilt"},
      "capabilities": [{"from": 0, "to": 255, "description": "Tilt"}] },
    {"id": "c7", "name": "Tilt fine", "defaultValue": 0, "type": "tilt", "role": "FINE",
      "preset": {"type": "tilt"},
      "capabilities": [{"from": 0, "to": 255, "description": "Fine tilt"}] },
    {"id": "c8", "name": "Custom Functions", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Reset stuff"}] },
    {"id": "c9", "name": "Color Wheel", "defaultValue": 0, "type": "colourWheel", "role": "COARSE",
      "preset": {"type": "colourWheel"},
      "capabilities": [{"from": 0, "to": 255, "description": "Colour wheel"}] },
    {"id": "c10", "name": "Red", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c11", "name": "Green", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c12", "name": "Blue", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c13", "name": "White", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c14", "name": "Color slow change", "defaultValue": 0, "type": "colourWheel", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c15", "name": "LED Gobo", "defaultValue": 0, "type": "gobo", "role": "COARSE",
      "preset": {"type": "gobo"},
      "capabilities": [{"from": 0, "to": 255, "description": "Gobo wheel"}] },
    {"id": "c16", "name": "Built-in effects", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c17", "name": "Effect Speed", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c18", "name": "Effect Slow Input", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c19", "name": "Effect Red", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c20", "name": "Effect Green", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c21", "name": "Effect Blue", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c22", "name": "Effect White", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c23", "name": "Effect Dimmer", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c24", "name": "Effect backlight", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] },
    {"id": "c25", "name": "Reserve", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "Not important"}] }
  ]'::jsonb,
  '[
    {"id": "m1", "name": "Standard", "channelIds": ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24", "c25"], "heads": [{"name": "Head 1", "channelIndexes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]}]}
  ]'::jsonb,
  '{"columns": 1, "rows": 1, "maxPan": 538, "maxTilt": 267, "minBeamAngle": 7, "maxBeamAngle": 38, "brightnessModifier": 100}'::jsonb,
  'qlcplus',
  $qxf$<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE FixtureDefinition>
<FixtureDefinition xmlns="http://www.qlcplus.org/FixtureDefinition">
 <Creator>
  <Name>Q Light Controller Plus</Name>
  <Version>5.2.1</Version>
  <Author>marcu</Author>
 </Creator>
 <Manufacturer>Clair Lighting</Manufacturer>
 <Model>Genius 19 V2</Model>
 <Type>Moving Head</Type>
 <Channel Name="Strobe (Custom)">
  <Group Byte="0">Shutter</Group>
  <Capability Min="0" Max="255">Strobe stuff</Capability>
 </Channel>
 <Channel Name="Master dimmer" Preset="IntensityMasterDimmer"/>
 <Channel Name="Focus/Zoom" Preset="BeamZoomBigSmall"/>
 <Channel Name="Pan" Preset="PositionPan"/>
 <Channel Name="Pan fine" Preset="PositionPanFine"/>
 <Channel Name="Tilt" Preset="PositionTilt"/>
 <Channel Name="Tilt fine" Preset="PositionTiltFine"/>
 <Channel Name="Custom Functions">
  <Group Byte="0">Nothing</Group>
  <Capability Min="0" Max="255" Preset="ShutterOpen">Reset stuff</Capability>
 </Channel>
 <Channel Name="Color Wheel" Preset="ColorWheel"/>
 <Channel Name="Red" Preset="IntensityRed"/>
 <Channel Name="Green" Preset="IntensityGreen"/>
 <Channel Name="Blue" Preset="IntensityBlue"/>
 <Channel Name="White" Preset="IntensityWhite"/>
 <Channel Name="Color slow change">
  <Group Byte="0">Colour</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="LED Gobo" Preset="GoboWheel"/>
 <Channel Name="Built-in effects">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect Speed">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect Slow Input">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect Red">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect Green">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect Blue">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect White">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect Dimmer">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Effect backlight">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Channel Name="Reserve">
  <Group Byte="0">Nothing</Group>
  <Capability Min="0" Max="255">Not important</Capability>
 </Channel>
 <Mode Name="Standard">
  <Channel Number="0">Strobe (Custom)</Channel>
  <Channel Number="1">Master dimmer</Channel>
  <Channel Number="2">Focus/Zoom</Channel>
  <Channel Number="3">Pan</Channel>
  <Channel Number="4">Pan fine</Channel>
  <Channel Number="5">Tilt</Channel>
  <Channel Number="6">Tilt fine</Channel>
  <Channel Number="7">Custom Functions</Channel>
  <Channel Number="8">Color Wheel</Channel>
  <Channel Number="9">Red</Channel>
  <Channel Number="10">Green</Channel>
  <Channel Number="11">Blue</Channel>
  <Channel Number="12">White</Channel>
  <Channel Number="13">Color slow change</Channel>
  <Channel Number="14">LED Gobo</Channel>
  <Channel Number="15">Built-in effects</Channel>
  <Channel Number="16">Effect Speed</Channel>
  <Channel Number="17">Effect Slow Input</Channel>
  <Channel Number="18">Effect Red</Channel>
  <Channel Number="19">Effect Green</Channel>
  <Channel Number="20">Effect Blue</Channel>
  <Channel Number="21">Effect White</Channel>
  <Channel Number="22">Effect Dimmer</Channel>
  <Channel Number="23">Effect backlight</Channel>
  <Channel Number="24">Reserve</Channel>
  <Head>
   <Channel>0</Channel>
   <Channel>1</Channel>
   <Channel>2</Channel>
   <Channel>3</Channel>
   <Channel>4</Channel>
   <Channel>5</Channel>
   <Channel>6</Channel>
   <Channel>7</Channel>
   <Channel>8</Channel>
   <Channel>9</Channel>
   <Channel>10</Channel>
   <Channel>11</Channel>
   <Channel>12</Channel>
   <Channel>13</Channel>
   <Channel>14</Channel>
   <Channel>15</Channel>
   <Channel>16</Channel>
   <Channel>17</Channel>
   <Channel>18</Channel>
   <Channel>19</Channel>
   <Channel>20</Channel>
   <Channel>21</Channel>
   <Channel>22</Channel>
   <Channel>23</Channel>
   <Channel>24</Channel>
  </Head>
 </Mode>
 <Physical>
  <Bulb Type="LED" Lumens="0" ColourTemperature="0"/>
  <Dimensions Weight="0" Width="328" Height="407" Depth="229"/>
  <Lens Name="Fresnel" DegreesMin="7" DegreesMax="38"/>
  <Focus Type="Fixed" PanMax="538" TiltMax="267"/>
  <Technical PowerConsumption="0" DmxConnector="Other"/>
 </Physical>
</FixtureDefinition>
$qxf$,
  now(), now()
);
