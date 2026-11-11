INSERT INTO v2.fixture_templates
  (name, manufacturer, model, type, channels, modes, properties, import_type, raw_source, created_at, updated_at)
SELECT
  'EUROLIGHT LED FLOODLIGHT BAR 240-8 RGB',
  'Behringer',
  'EUROLIGHT LED FLOODLIGHT BAR 240-8 RGB',
  'bar_pixel',                             -- QLC+ "LED Bar (Pixels)"
  '[
    {"id": "c1", "name": "Red 1", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c2", "name": "Green 1", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c3", "name": "Blue 1", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c4", "name": "Red 2", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c5", "name": "Green 2", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c6", "name": "Blue 2", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c7", "name": "Red 3", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c8", "name": "Green 3", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c9", "name": "Blue 3", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c10", "name": "Red 4", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c11", "name": "Green 4", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c12", "name": "Blue 4", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c13", "name": "Red 5", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c14", "name": "Green 5", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c15", "name": "Blue 5", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c16", "name": "Red 6", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c17", "name": "Green 6", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c18", "name": "Blue 6", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c19", "name": "Red 7", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c20", "name": "Green 7", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c21", "name": "Blue 7", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c22", "name": "Red 8", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c23", "name": "Green 8", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c24", "name": "Blue 8", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c25", "name": "LED Full Dimmer", "defaultValue": 0, "type": "masterDimmer", "role": "COARSE",
      "preset": {"type": "masterDimmer"},
      "capabilities": [{"from": 0, "to": 255, "description": "Intensity"}] },
    {"id": "c26", "name": "LED on/Strobe", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "not important"}] },
    {"id": "c27", "name": "Effect", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 231, "description": "not important"},
        {"from": 232, "to": 255, "description": "Sound Control"} ] },
    {"id": "c28", "name": "Speed/Sound control", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 63, "description": "Nothing"},
        {"from": 64, "to": 231, "description": "Show color speed: 1CH value: 064-231"},
        {"from": 232, "to": 255, "description": "Sensitivity, sound sensitivity is higher when DMX higher"} ] }
  ]'::jsonb,
  '[
    {"id": "m1", "name": "28ch", "channelIds": ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24", "c25", "c26", "c27", "c28"], "heads": [{"name": "Head 1", "channelIndexes": [0, 1, 2]}, {"name": "Head 2", "channelIndexes": [3, 4, 5]}, {"name": "Head 3", "channelIndexes": [6, 7, 8]}, {"name": "Head 4", "channelIndexes": [9, 10, 11]}, {"name": "Head 5", "channelIndexes": [12, 13, 14]}, {"name": "Head 6", "channelIndexes": [15, 16, 17]}, {"name": "Head 7", "channelIndexes": [20, 18, 19]}, {"name": "Head 8", "channelIndexes": [23, 22, 21]}]}
  ]'::jsonb,
  '{"columns": 8, "rows": 1, "maxPan": 0, "maxTilt": 0, "minBeamAngle": 30, "maxBeamAngle": 30, "brightnessModifier": 100}'::jsonb,
  'qlcplus',
  $qxf$<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE FixtureDefinition>
<FixtureDefinition xmlns="http://www.qlcplus.org/FixtureDefinition">
 <Creator>
  <Name>Q Light Controller Plus</Name>
  <Version>5.2.2</Version>
  <Author>Marcus</Author>
 </Creator>
 <Manufacturer>Behringer</Manufacturer>
 <Model>EUROLIGHT
LED FLOODLIGHT BAR 240-8 RGB</Model>
 <Type>LED Bar (Pixels)</Type>
 <Channel Name="Red 1" Preset="IntensityRed"/>
 <Channel Name="Green 1" Preset="IntensityGreen"/>
 <Channel Name="Blue 1" Preset="IntensityBlue"/>
 <Channel Name="Red 2" Preset="IntensityRed"/>
 <Channel Name="Green 2" Preset="IntensityGreen"/>
 <Channel Name="Blue 2" Preset="IntensityBlue"/>
 <Channel Name="Red 3" Preset="IntensityRed"/>
 <Channel Name="Green 3" Preset="IntensityGreen"/>
 <Channel Name="Blue 3" Preset="IntensityBlue"/>
 <Channel Name="Red 4" Preset="IntensityRed"/>
 <Channel Name="Green 4" Preset="IntensityGreen"/>
 <Channel Name="Blue 4" Preset="IntensityBlue"/>
 <Channel Name="Red 5" Preset="IntensityRed"/>
 <Channel Name="Green 5" Preset="IntensityGreen"/>
 <Channel Name="Blue 5" Preset="IntensityBlue"/>
 <Channel Name="Red 6" Preset="IntensityRed"/>
 <Channel Name="Green 6" Preset="IntensityGreen"/>
 <Channel Name="Blue 6" Preset="IntensityBlue"/>
 <Channel Name="Red 7" Preset="IntensityRed"/>
 <Channel Name="Green 7" Preset="IntensityGreen"/>
 <Channel Name="Blue 7" Preset="IntensityBlue"/>
 <Channel Name="Red 8" Preset="IntensityRed"/>
 <Channel Name="Green 8" Preset="IntensityGreen"/>
 <Channel Name="Blue 8" Preset="IntensityBlue"/>
 <Channel Name="LED Full Dimmer" Preset="IntensityMasterDimmer"/>
 <Channel Name="LED on/Strobe">
  <Group Byte="0">Nothing</Group>
  <Capability Min="0" Max="255">not important</Capability>
 </Channel>
 <Channel Name="Effect">
  <Group Byte="0">Nothing</Group>
  <Capability Min="0" Max="231">not important</Capability>
  <Capability Min="232" Max="255">Sound Control</Capability>
 </Channel>
 <Channel Name="Speed/Sound control">
  <Group Byte="0">Nothing</Group>
  <Capability Min="0" Max="63">Nothing</Capability>
  <Capability Min="64" Max="231">Show color speed: 1CH value: 064-231</Capability>
  <Capability Min="232" Max="255">Sensitivity, sound sensitivity is higher when DMX higher</Capability>
 </Channel>
 <Mode Name="28ch">
  <Channel Number="0">Red 1</Channel>
  <Channel Number="1">Green 1</Channel>
  <Channel Number="2">Blue 1</Channel>
  <Channel Number="3">Red 2</Channel>
  <Channel Number="4">Green 2</Channel>
  <Channel Number="5">Blue 2</Channel>
  <Channel Number="6">Red 3</Channel>
  <Channel Number="7">Green 3</Channel>
  <Channel Number="8">Blue 3</Channel>
  <Channel Number="9">Red 4</Channel>
  <Channel Number="10">Green 4</Channel>
  <Channel Number="11">Blue 4</Channel>
  <Channel Number="12">Red 5</Channel>
  <Channel Number="13">Green 5</Channel>
  <Channel Number="14">Blue 5</Channel>
  <Channel Number="15">Red 6</Channel>
  <Channel Number="16">Green 6</Channel>
  <Channel Number="17">Blue 6</Channel>
  <Channel Number="18">Red 7</Channel>
  <Channel Number="19">Green 7</Channel>
  <Channel Number="20">Blue 7</Channel>
  <Channel Number="21">Red 8</Channel>
  <Channel Number="22">Green 8</Channel>
  <Channel Number="23">Blue 8</Channel>
  <Channel Number="24">LED Full Dimmer</Channel>
  <Channel Number="25">LED on/Strobe</Channel>
  <Channel Number="26">Effect</Channel>
  <Channel Number="27">Speed/Sound control</Channel>
  <Head>
   <Channel>0</Channel>
   <Channel>1</Channel>
   <Channel>2</Channel>
  </Head>
  <Head>
   <Channel>3</Channel>
   <Channel>4</Channel>
   <Channel>5</Channel>
  </Head>
  <Head>
   <Channel>6</Channel>
   <Channel>7</Channel>
   <Channel>8</Channel>
  </Head>
  <Head>
   <Channel>9</Channel>
   <Channel>10</Channel>
   <Channel>11</Channel>
  </Head>
  <Head>
   <Channel>12</Channel>
   <Channel>13</Channel>
   <Channel>14</Channel>
  </Head>
  <Head>
   <Channel>15</Channel>
   <Channel>16</Channel>
   <Channel>17</Channel>
  </Head>
  <Head>
   <Channel>20</Channel>
   <Channel>18</Channel>
   <Channel>19</Channel>
  </Head>
  <Head>
   <Channel>23</Channel>
   <Channel>22</Channel>
   <Channel>21</Channel>
  </Head>
 </Mode>
 <Physical>
  <Bulb Type="LED" Lumens="1000" ColourTemperature="0"/>
  <Dimensions Weight="1.85" Width="1079" Height="66" Depth="89"/>
  <Lens Name="Other" DegreesMin="30" DegreesMax="30"/>
  <Focus Type="Fixed" PanMax="0" TiltMax="0"/>
  <Layout Width="8" Height="1"/>
  <Technical PowerConsumption="0" DmxConnector="5-pin"/>
 </Physical>
</FixtureDefinition>
$qxf$,
  now(), now()
-- Only if the library doesn't have it yet. Soft-deleted rows count too, so a removed template stays removed.
WHERE NOT EXISTS (
  SELECT 1 FROM v2.fixture_templates WHERE manufacturer = 'Behringer' AND model = 'EUROLIGHT LED FLOODLIGHT BAR 240-8 RGB'
);
