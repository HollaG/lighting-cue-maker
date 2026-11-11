INSERT INTO v2.fixture_templates
  (name, manufacturer, model, type, channels, modes, properties, import_type, raw_source, created_at, updated_at)
SELECT
  'RGBW 80W',
  'GZYLIGHTING',
  'RGBW 80W',
  'bar_pixel',                             -- QLC+ "LED Bar (Pixels)"
  '[
    {"id": "c1", "name": "Master dimmer", "defaultValue": 0, "type": "masterDimmer", "role": "COARSE",
      "preset": {"type": "masterDimmer"},
      "capabilities": [{"from": 0, "to": 255, "description": "Intensity"}] },
    {"id": "c2", "name": "Red 1", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c3", "name": "Green 1", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c4", "name": "Blue 1", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c5", "name": "White 1", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c6", "name": "Red 2", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c7", "name": "Green 2", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c8", "name": "Blue 2", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c9", "name": "White 2", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c10", "name": "Red 3", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c11", "name": "Green 3", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c12", "name": "Blue 3", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c13", "name": "White 3", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c14", "name": "Red 4", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c15", "name": "Green 4", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c16", "name": "Blue 4", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c17", "name": "White 4", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c18", "name": "Red 5", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c19", "name": "Green 5", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c20", "name": "Blue 5", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c21", "name": "White 5", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c22", "name": "Red 6", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c23", "name": "Green 6", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c24", "name": "Blue 6", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c25", "name": "White 6", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c26", "name": "Red 7", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c27", "name": "Green 7", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c28", "name": "Blue 7", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c29", "name": "White 7", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] },
    {"id": "c30", "name": "Red 8", "defaultValue": 0, "type": "red", "role": "COARSE",
      "preset": {"type": "red"},
      "capabilities": [{"from": 0, "to": 255, "description": "Red intensity"}] },
    {"id": "c31", "name": "Green 8", "defaultValue": 0, "type": "green", "role": "COARSE",
      "preset": {"type": "green"},
      "capabilities": [{"from": 0, "to": 255, "description": "Green intensity"}] },
    {"id": "c32", "name": "Blue 8", "defaultValue": 0, "type": "blue", "role": "COARSE",
      "preset": {"type": "blue"},
      "capabilities": [{"from": 0, "to": 255, "description": "Blue intensity"}] },
    {"id": "c33", "name": "White 8", "defaultValue": 0, "type": "white", "role": "COARSE",
      "preset": {"type": "white"},
      "capabilities": [{"from": 0, "to": 255, "description": "White intensity"}] }
  ]'::jsonb,
  '[
    {"id": "m1", "name": "33ch", "channelIds": ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24", "c25", "c26", "c27", "c28", "c29", "c30", "c31", "c32", "c33"], "heads": [{"name": "Head 1", "channelIndexes": [1, 2, 3, 4]}, {"name": "Head 2", "channelIndexes": [5, 6, 7, 8]}, {"name": "Head 3", "channelIndexes": [9, 10, 11, 12]}, {"name": "Head 4", "channelIndexes": [13, 14, 15, 16]}, {"name": "Head 5", "channelIndexes": [17, 18, 19, 20]}, {"name": "Head 6", "channelIndexes": [21, 22, 23, 24]}, {"name": "Head 7", "channelIndexes": [25, 26, 27, 28]}, {"name": "Head 8", "channelIndexes": [29, 30, 31, 32]}]}
  ]'::jsonb,
  '{"columns": 8, "rows": 1, "maxPan": 0, "maxTilt": 0, "minBeamAngle": 25, "maxBeamAngle": 25, "brightnessModifier": 100}'::jsonb,
  'qlcplus',
  $qxf$<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE FixtureDefinition>
<FixtureDefinition xmlns="http://www.qlcplus.org/FixtureDefinition">
 <Creator>
  <Name>Q Light Controller Plus</Name>
  <Version>5.2.2</Version>
  <Author>marcus</Author>
 </Creator>
 <Manufacturer>GZYLIGHTING</Manufacturer>
 <Model>RGBW 80W</Model>
 <Type>LED Bar (Pixels)</Type>
 <Channel Name="Master dimmer" Preset="IntensityMasterDimmer"/>
 <Channel Name="Red 1" Preset="IntensityRed"/>
 <Channel Name="Green 1" Preset="IntensityGreen"/>
 <Channel Name="Blue 1" Preset="IntensityBlue"/>
 <Channel Name="White 1" Preset="IntensityWhite"/>
 <Channel Name="Red 2" Preset="IntensityRed"/>
 <Channel Name="Green 2" Preset="IntensityGreen"/>
 <Channel Name="Blue 2" Preset="IntensityBlue"/>
 <Channel Name="White 2" Preset="IntensityWhite"/>
 <Channel Name="Red 3" Preset="IntensityRed"/>
 <Channel Name="Green 3" Preset="IntensityGreen"/>
 <Channel Name="Blue 3" Preset="IntensityBlue"/>
 <Channel Name="White 3" Preset="IntensityWhite"/>
 <Channel Name="Red 4" Preset="IntensityRed"/>
 <Channel Name="Green 4" Preset="IntensityGreen"/>
 <Channel Name="Blue 4" Preset="IntensityBlue"/>
 <Channel Name="White 4" Preset="IntensityWhite"/>
 <Channel Name="Red 5" Preset="IntensityRed"/>
 <Channel Name="Green 5" Preset="IntensityGreen"/>
 <Channel Name="Blue 5" Preset="IntensityBlue"/>
 <Channel Name="White 5" Preset="IntensityWhite"/>
 <Channel Name="Red 6" Preset="IntensityRed"/>
 <Channel Name="Green 6" Preset="IntensityGreen"/>
 <Channel Name="Blue 6" Preset="IntensityBlue"/>
 <Channel Name="White 6" Preset="IntensityWhite"/>
 <Channel Name="Red 7" Preset="IntensityRed"/>
 <Channel Name="Green 7" Preset="IntensityGreen"/>
 <Channel Name="Blue 7" Preset="IntensityBlue"/>
 <Channel Name="White 7" Preset="IntensityWhite"/>
 <Channel Name="Red 8" Preset="IntensityRed"/>
 <Channel Name="Green 8" Preset="IntensityGreen"/>
 <Channel Name="Blue 8" Preset="IntensityBlue"/>
 <Channel Name="White 8" Preset="IntensityWhite"/>
 <Mode Name="33ch">
  <Channel Number="0">Master dimmer</Channel>
  <Channel Number="1">Red 1</Channel>
  <Channel Number="2">Green 1</Channel>
  <Channel Number="3">Blue 1</Channel>
  <Channel Number="4">White 1</Channel>
  <Channel Number="5">Red 2</Channel>
  <Channel Number="6">Green 2</Channel>
  <Channel Number="7">Blue 2</Channel>
  <Channel Number="8">White 2</Channel>
  <Channel Number="9">Red 3</Channel>
  <Channel Number="10">Green 3</Channel>
  <Channel Number="11">Blue 3</Channel>
  <Channel Number="12">White 3</Channel>
  <Channel Number="13">Red 4</Channel>
  <Channel Number="14">Green 4</Channel>
  <Channel Number="15">Blue 4</Channel>
  <Channel Number="16">White 4</Channel>
  <Channel Number="17">Red 5</Channel>
  <Channel Number="18">Green 5</Channel>
  <Channel Number="19">Blue 5</Channel>
  <Channel Number="20">White 5</Channel>
  <Channel Number="21">Red 6</Channel>
  <Channel Number="22">Green 6</Channel>
  <Channel Number="23">Blue 6</Channel>
  <Channel Number="24">White 6</Channel>
  <Channel Number="25">Red 7</Channel>
  <Channel Number="26">Green 7</Channel>
  <Channel Number="27">Blue 7</Channel>
  <Channel Number="28">White 7</Channel>
  <Channel Number="29">Red 8</Channel>
  <Channel Number="30">Green 8</Channel>
  <Channel Number="31">Blue 8</Channel>
  <Channel Number="32">White 8</Channel>
  <Head>
   <Channel>1</Channel>
   <Channel>2</Channel>
   <Channel>3</Channel>
   <Channel>4</Channel>
  </Head>
  <Head>
   <Channel>5</Channel>
   <Channel>6</Channel>
   <Channel>7</Channel>
   <Channel>8</Channel>
  </Head>
  <Head>
   <Channel>9</Channel>
   <Channel>10</Channel>
   <Channel>11</Channel>
   <Channel>12</Channel>
  </Head>
  <Head>
   <Channel>13</Channel>
   <Channel>14</Channel>
   <Channel>15</Channel>
   <Channel>16</Channel>
  </Head>
  <Head>
   <Channel>17</Channel>
   <Channel>18</Channel>
   <Channel>19</Channel>
   <Channel>20</Channel>
  </Head>
  <Head>
   <Channel>21</Channel>
   <Channel>22</Channel>
   <Channel>23</Channel>
   <Channel>24</Channel>
  </Head>
  <Head>
   <Channel>25</Channel>
   <Channel>26</Channel>
   <Channel>27</Channel>
   <Channel>28</Channel>
  </Head>
  <Head>
   <Channel>29</Channel>
   <Channel>30</Channel>
   <Channel>31</Channel>
   <Channel>32</Channel>
  </Head>
 </Mode>
 <Physical>
  <Bulb Type="LED" Lumens="5000" ColourTemperature="5600"/>
  <Dimensions Weight="0" Width="1072" Height="85" Depth="64"/>
  <Lens Name="Other" DegreesMin="25" DegreesMax="25"/>
  <Focus Type="Fixed" PanMax="0" TiltMax="0"/>
  <Layout Width="8" Height="1"/>
  <Technical PowerConsumption="2" DmxConnector="5-pin"/>
 </Physical>
</FixtureDefinition>
$qxf$,
  now(), now()
-- Only if the library doesn't have it yet. Soft-deleted rows count too, so a removed template stays removed.
WHERE NOT EXISTS (
  SELECT 1 FROM v2.fixture_templates WHERE manufacturer = 'GZYLIGHTING' AND model = 'RGBW 80W'
);
