INSERT INTO v2.fixture_templates
  (name, manufacturer, model, type, channels, modes, properties, import_type, raw_source, created_at, updated_at)
VALUES (
  'LED SPOT 330 CMY',
  'Clair Lighting',
  'LED SPOT 330 CMY',
  'moving_head',                           -- QLC+ "Moving Head"
  '[
    {"id": "c1", "name": "Pan", "defaultValue": 0, "type": "pan", "role": "COARSE",
      "preset": {"type": "pan"},
      "capabilities": [{"from": 0, "to": 255, "description": "Pan"}] },
    {"id": "c2", "name": "Pan Fine", "defaultValue": 0, "type": "pan", "role": "FINE",
      "preset": {"type": "pan"},
      "capabilities": [{"from": 0, "to": 255, "description": "Fine pan"}] },
    {"id": "c3", "name": "Tilt", "defaultValue": 0, "type": "tilt", "role": "COARSE",
      "preset": {"type": "tilt"},
      "capabilities": [{"from": 0, "to": 255, "description": "Tilt"}] },
    {"id": "c4", "name": "Tilt Fine", "defaultValue": 0, "type": "tilt", "role": "FINE",
      "preset": {"type": "tilt"},
      "capabilities": [{"from": 0, "to": 255, "description": "Fine tilt"}] },
    {"id": "c5", "name": "Pan speed", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {"type": "custom"},
      "capabilities": [{"from": 0, "to": 255, "description": "Pan speed (fast to slow)"}] },
    {"id": "c6", "name": "Strobe (Custom)", "defaultValue": 255, "type": "shutter", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 3, "description": "Close"},
        {"from": 4, "to": 103, "description": "Strobe (Slow to Fast)"},
        {"from": 104, "to": 107, "description": "Open"},
        {"from": 108, "to": 207, "description": "Pulse (Slow to Fast)"},
        {"from": 208, "to": 212, "description": "Open"},
        {"from": 213, "to": 225, "description": "Random Strobe (Slow)"},
        {"from": 226, "to": 238, "description": "Random Strobe (Medium)"},
        {"from": 239, "to": 251, "description": "Random Strobe (Fast)"},
        {"from": 252, "to": 255, "description": "Open"} ] },
    {"id": "c7", "name": "Cyan", "defaultValue": 0, "type": "cyan", "role": "COARSE",
      "preset": {"type": "cyan"},
      "capabilities": [{"from": 0, "to": 255, "description": "Cyan intensity"}] },
    {"id": "c8", "name": "Magenta", "defaultValue": 0, "type": "magenta", "role": "COARSE",
      "preset": {"type": "magenta"},
      "capabilities": [{"from": 0, "to": 255, "description": "Magenta intensity"}] },
    {"id": "c9", "name": "Yellow", "defaultValue": 0, "type": "yellow", "role": "COARSE",
      "preset": {"type": "yellow"},
      "capabilities": [{"from": 0, "to": 255, "description": "Yellow intensity"}] },
    {"id": "c10", "name": "Color1", "defaultValue": 0, "type": "colourWheel", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 0, "description": "White"},
        {"from": 1, "to": 57, "description": "Undefined"},
        {"from": 58, "to": 58, "description": "Amber"},
        {"from": 59, "to": 129, "description": "Undefined"},
        {"from": 130, "to": 130, "description": "Blue"},
        {"from": 131, "to": 190, "description": "Undefined"},
        {"from": 191, "to": 191, "description": "Pink"},
        {"from": 192, "to": 254, "description": "Undefined"},
        {"from": 255, "to": 255, "description": "Cyan"} ] },
    {"id": "c11", "name": "Color2", "defaultValue": 0, "type": "colourWheel", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 0, "description": "White"},
        {"from": 1, "to": 120, "description": "Undefined"},
        {"from": 121, "to": 121, "description": "Green"},
        {"from": 122, "to": 192, "description": "Undefined"},
        {"from": 193, "to": 193, "description": "Red"},
        {"from": 194, "to": 254, "description": "Undefined"},
        {"from": 255, "to": 255, "description": "Magenta"} ] },
    {"id": "c12", "name": "Color3", "defaultValue": 0, "type": "colourWheel", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 0, "description": "White"},
        {"from": 1, "to": 64, "description": "Undefined"},
        {"from": 65, "to": 65, "description": "Lime"},
        {"from": 66, "to": 191, "description": "Undefined"},
        {"from": 192, "to": 192, "description": "Gold"},
        {"from": 193, "to": 254, "description": "Undefined"},
        {"from": 255, "to": 255, "description": "Yellow"} ] },
    {"id": "c13", "name": "Static Gobo", "defaultValue": 0, "type": "gobo", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 5, "description": "Open"},
        {"from": 6, "to": 10, "description": "Gobo1"},
        {"from": 11, "to": 15, "description": "Gobo2"},
        {"from": 16, "to": 20, "description": "Gobo3"},
        {"from": 21, "to": 25, "description": "Gobo4"},
        {"from": 26, "to": 30, "description": "Gobo5"},
        {"from": 31, "to": 35, "description": "Gobo6"},
        {"from": 36, "to": 40, "description": "Gobo7"},
        {"from": 41, "to": 45, "description": "Gobo8"},
        {"from": 46, "to": 50, "description": "Gobo9"},
        {"from": 51, "to": 55, "description": "Gobo10"},
        {"from": 56, "to": 62, "description": "Gobo1 Shake: Slow -> Fast"},
        {"from": 63, "to": 69, "description": "Gobo2 Shake: Slow -> Fast"},
        {"from": 70, "to": 76, "description": "Gobo3 Shake: Slow -> Fast"},
        {"from": 77, "to": 83, "description": "Gobo4 Shake: Slow -> Fast"},
        {"from": 84, "to": 90, "description": "Gobo5 Shake: Slow -> Fast"},
        {"from": 91, "to": 97, "description": "Gobo6 Shake: Slow -> Fast"},
        {"from": 98, "to": 104, "description": "Gobo7 Shake: Slow -> Fast"},
        {"from": 105, "to": 111, "description": "Gobo8 Shake: Slow -> Fast"},
        {"from": 112, "to": 118, "description": "Gobo9 Shake: Slow -> Fast"},
        {"from": 119, "to": 125, "description": "Gobo10 Shake: Slow -> Fast"},
        {"from": 126, "to": 190, "description": "Rotation(CW): Slow -> Fast"},
        {"from": 191, "to": 255, "description": "Rotation(CCW): Slow -> Fast"} ] },
    {"id": "c14", "name": "Rotating Gobo", "defaultValue": 0, "type": "gobo", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 7, "description": "Open"},
        {"from": 8, "to": 15, "description": "Gobo1"},
        {"from": 16, "to": 23, "description": "Gobo2"},
        {"from": 24, "to": 31, "description": "Gobo3"},
        {"from": 32, "to": 39, "description": "Gobo4"},
        {"from": 40, "to": 47, "description": "Gobo5"},
        {"from": 48, "to": 55, "description": "Gobo6"},
        {"from": 56, "to": 63, "description": "Gobo7"},
        {"from": 64, "to": 71, "description": "Gobo1 Shake: Slow -> Fast"},
        {"from": 72, "to": 79, "description": "Gobo2 Shake: Slow -> Fast"},
        {"from": 80, "to": 87, "description": "Gobo3 Shake: Slow -> Fast"},
        {"from": 88, "to": 95, "description": "Gobo4 Shake: Slow -> Fast"},
        {"from": 96, "to": 103, "description": "Gobo5 Shake: Slow -> Fast"},
        {"from": 104, "to": 111, "description": "Gobo6 Shake: Slow -> Fast"},
        {"from": 112, "to": 119, "description": "Gobo7 Shake: Slow -> Fast"},
        {"from": 120, "to": 187, "description": "Rotation(CW): Slow -> Fast"},
        {"from": 188, "to": 255, "description": "Rotation(CCW): Slow -> Fast"} ] },
    {"id": "c15", "name": "Gobo Rotation (2)", "defaultValue": 0, "type": "gobo", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 127, "description": "Gobo Position"},
        {"from": 128, "to": 192, "description": "Gobo Rotation(CW): Fast -> Slow"},
        {"from": 193, "to": 255, "description": "Gobo Rotation(CCW): Slow -> Fast"} ] },
    {"id": "c16", "name": "Iris (Custom)", "defaultValue": 0, "type": "shutter", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 127, "description": "Iris Position"},
        {"from": 128, "to": 192, "description": "Iris Pulse Opening: Slow -> Fast"},
        {"from": 193, "to": 255, "description": "Iris Pulse Closing: Slow -> Fast"} ] },
    {"id": "c17", "name": "Prism", "defaultValue": 0, "type": "prism", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 127, "description": "Open"},
        {"from": 128, "to": 255, "description": "Prism"} ] },
    {"id": "c18", "name": "Prism Rotation (Custom)", "defaultValue": 0, "type": "prism", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 127, "description": "Prism Position"},
        {"from": 128, "to": 189, "description": "Prism Rotation(CW): Fast -> Slow"},
        {"from": 190, "to": 193, "description": "Prism Static"},
        {"from": 194, "to": 255, "description": "Prism Rotation(CCW): Slow -> Fast"} ] },
    {"id": "c19", "name": "Frost", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 127, "description": "Frost Open"},
        {"from": 128, "to": 255, "description": "Frost In"} ] },
    {"id": "c20", "name": "Focus", "defaultValue": 0, "type": "focus", "role": "COARSE", "reversed": true,
      "preset": {"type": "focus"},
      "capabilities": [{"from": 0, "to": 255, "description": "Focus (far to near)"}] },
    {"id": "c21", "name": "Focus fine", "defaultValue": 0, "type": "focus", "role": "FINE",
      "preset": {"type": "focus"},
      "capabilities": [{"from": 0, "to": 255, "description": "Fine focus"}] },
    {"id": "c22", "name": "Zoom", "defaultValue": 0, "type": "zoom", "role": "COARSE",
      "preset": {"type": "zoom"},
      "capabilities": [{"from": 0, "to": 255, "description": "Zoom (small to big)"}] },
    {"id": "c23", "name": "Zoom fine", "defaultValue": 0, "type": "zoom", "role": "FINE",
      "preset": {"type": "zoom"},
      "capabilities": [{"from": 0, "to": 255, "description": "Fine zoom"}] },
    {"id": "c24", "name": "Autofocus (Custom)", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [{"from": 0, "to": 255, "description": "beam AF"}] },
    {"id": "c25", "name": "System Control", "defaultValue": 0, "type": "custom", "role": "COARSE",
      "preset": {},
      "capabilities": [
        {"from": 0, "to": 119, "description": "Unused"},
        {"from": 120, "to": 160, "description": "Pan and tilt reset"},
        {"from": 161, "to": 200, "description": "Head reset"},
        {"from": 201, "to": 255, "description": "All reset"} ] },
    {"id": "c26", "name": "Dimmer", "defaultValue": 0, "type": "masterDimmer", "role": "COARSE",
      "preset": {"type": "masterDimmer"},
      "capabilities": [{"from": 0, "to": 255, "description": "Intensity"}] }
  ]'::jsonb,
  '[
    {"id": "m1", "name": "Standard", "channelIds": ["c1", "c2", "c3", "c4", "c5", "c26", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24", "c25"], "heads": [{"name": "Head 1", "channelIndexes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}]}
  ]'::jsonb,
  '{"columns": 1, "rows": 1, "maxPan": 541, "maxTilt": 273, "minBeamAngle": 9, "maxBeamAngle": 40, "brightnessModifier": 100}'::jsonb,
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
 <Model>LED SPOT 330 CMY</Model>
 <Type>Moving Head</Type>
 <Channel Name="Pan" Preset="PositionPan"/>
 <Channel Name="Pan Fine" Preset="PositionPanFine"/>
 <Channel Name="Tilt" Preset="PositionTilt"/>
 <Channel Name="Tilt Fine" Preset="PositionTiltFine"/>
 <Channel Name="Pan speed" Preset="SpeedPanFastSlow"/>
 <Channel Name="Strobe (Custom)" Default="255">
  <Group Byte="0">Shutter</Group>
  <Capability Min="0" Max="3" Preset="ShutterClose">Close</Capability>
  <Capability Min="4" Max="103" Preset="StrobeSlowToFast">Strobe (Slow to Fast)</Capability>
  <Capability Min="104" Max="107" Preset="ShutterOpen">Open</Capability>
  <Capability Min="108" Max="207" Preset="PulseSlowToFast">Pulse (Slow to Fast)</Capability>
  <Capability Min="208" Max="212" Preset="ShutterOpen">Open</Capability>
  <Capability Min="213" Max="225" Preset="StrobeRandom">Random Strobe (Slow)</Capability>
  <Capability Min="226" Max="238" Preset="StrobeRandom">Random Strobe (Medium)</Capability>
  <Capability Min="239" Max="251" Preset="StrobeRandom">Random Strobe (Fast)</Capability>
  <Capability Min="252" Max="255" Preset="ShutterOpen">Open</Capability>
 </Channel>
 <Channel Name="Cyan" Preset="IntensityCyan"/>
 <Channel Name="Magenta" Preset="IntensityMagenta"/>
 <Channel Name="Yellow" Preset="IntensityYellow"/>
 <Channel Name="Color1">
  <Group Byte="0">Colour</Group>
  <Capability Min="0" Max="0" Preset="ColorMacro" Res1="#ffffff">White</Capability>
  <Capability Min="1" Max="57">Undefined</Capability>
  <Capability Min="58" Max="58" Preset="ColorMacro" Res1="#ffe54e">Amber</Capability>
  <Capability Min="59" Max="129">Undefined</Capability>
  <Capability Min="130" Max="130" Preset="ColorMacro" Res1="#3333ff">Blue</Capability>
  <Capability Min="131" Max="190">Undefined</Capability>
  <Capability Min="191" Max="191" Preset="ColorMacro" Res1="#ff99ff">Pink</Capability>
  <Capability Min="192" Max="254">Undefined</Capability>
  <Capability Min="255" Max="255" Preset="ColorMacro" Res1="#33ffff">Cyan</Capability>
 </Channel>
 <Channel Name="Color2">
  <Group Byte="0">Colour</Group>
  <Capability Min="0" Max="0" Preset="ColorMacro" Res1="#ffffff">White</Capability>
  <Capability Min="1" Max="120">Undefined</Capability>
  <Capability Min="121" Max="121" Preset="ColorMacro" Res1="#33ff33">Green</Capability>
  <Capability Min="122" Max="192">Undefined</Capability>
  <Capability Min="193" Max="193" Preset="ColorMacro" Res1="#ff3333">Red</Capability>
  <Capability Min="194" Max="254">Undefined</Capability>
  <Capability Min="255" Max="255" Preset="ColorMacro" Res1="#ff33ff">Magenta</Capability>
 </Channel>
 <Channel Name="Color3">
  <Group Byte="0">Colour</Group>
  <Capability Min="0" Max="0" Preset="ColorMacro" Res1="#ffffff">White</Capability>
  <Capability Min="1" Max="64">Undefined</Capability>
  <Capability Min="65" Max="65" Preset="ColorMacro" Res1="#98fb98">Lime</Capability>
  <Capability Min="66" Max="191">Undefined</Capability>
  <Capability Min="192" Max="192" Preset="ColorMacro" Res1="#ffd700">Gold</Capability>
  <Capability Min="193" Max="254">Undefined</Capability>
  <Capability Min="255" Max="255" Preset="ColorMacro" Res1="#ffff33">Yellow</Capability>
 </Channel>
 <Channel Name="Static Gobo">
  <Group Byte="0">Gobo</Group>
  <Capability Min="0" Max="5">Open</Capability>
  <Capability Min="6" Max="10" Preset="GoboMacro" Res1="">Gobo1</Capability>
  <Capability Min="11" Max="15" Preset="GoboMacro" Res1="">Gobo2</Capability>
  <Capability Min="16" Max="20" Preset="GoboMacro" Res1="">Gobo3</Capability>
  <Capability Min="21" Max="25" Preset="GoboMacro" Res1="">Gobo4</Capability>
  <Capability Min="26" Max="30" Preset="GoboMacro" Res1="">Gobo5</Capability>
  <Capability Min="31" Max="35" Preset="GoboMacro" Res1="">Gobo6</Capability>
  <Capability Min="36" Max="40" Preset="GoboMacro" Res1="">Gobo7</Capability>
  <Capability Min="41" Max="45" Preset="GoboMacro" Res1="">Gobo8</Capability>
  <Capability Min="46" Max="50" Preset="GoboMacro" Res1="">Gobo9</Capability>
  <Capability Min="51" Max="55" Preset="GoboMacro" Res1="">Gobo10</Capability>
  <Capability Min="56" Max="62" Preset="GoboShakeMacro" Res1="">Gobo1 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="63" Max="69" Preset="GoboShakeMacro" Res1="">Gobo2 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="70" Max="76" Preset="GoboShakeMacro" Res1="">Gobo3 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="77" Max="83" Preset="GoboShakeMacro" Res1="">Gobo4 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="84" Max="90" Preset="GoboShakeMacro" Res1="">Gobo5 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="91" Max="97" Preset="GoboShakeMacro" Res1="">Gobo6 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="98" Max="104" Preset="GoboShakeMacro" Res1="">Gobo7 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="105" Max="111" Preset="GoboShakeMacro" Res1="">Gobo8 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="112" Max="118" Preset="GoboShakeMacro" Res1="">Gobo9 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="119" Max="125" Preset="GoboShakeMacro" Res1="">Gobo10 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="126" Max="190" Preset="RotationClockwiseSlowToFast">Rotation(CW): Slow -&gt; Fast</Capability>
  <Capability Min="191" Max="255" Preset="RotationCounterClockwiseSlowToFast">Rotation(CCW): Slow -&gt; Fast</Capability>
 </Channel>
 <Channel Name="Rotating Gobo">
  <Group Byte="0">Gobo</Group>
  <Capability Min="0" Max="7">Open</Capability>
  <Capability Min="8" Max="15" Preset="GoboMacro" Res1="">Gobo1</Capability>
  <Capability Min="16" Max="23" Preset="GoboMacro" Res1="">Gobo2</Capability>
  <Capability Min="24" Max="31" Preset="GoboMacro" Res1="">Gobo3</Capability>
  <Capability Min="32" Max="39" Preset="GoboMacro" Res1="">Gobo4</Capability>
  <Capability Min="40" Max="47" Preset="GoboMacro" Res1="">Gobo5</Capability>
  <Capability Min="48" Max="55" Preset="GoboMacro" Res1="">Gobo6</Capability>
  <Capability Min="56" Max="63" Preset="GoboMacro" Res1="">Gobo7</Capability>
  <Capability Min="64" Max="71" Preset="GoboShakeMacro" Res1="">Gobo1 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="72" Max="79" Preset="GoboShakeMacro" Res1="">Gobo2 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="80" Max="87" Preset="GoboShakeMacro" Res1="">Gobo3 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="88" Max="95" Preset="GoboShakeMacro" Res1="">Gobo4 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="96" Max="103" Preset="GoboShakeMacro" Res1="">Gobo5 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="104" Max="111" Preset="GoboShakeMacro" Res1="">Gobo6 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="112" Max="119" Preset="GoboShakeMacro" Res1="">Gobo7 Shake: Slow -&gt; Fast</Capability>
  <Capability Min="120" Max="187" Preset="RotationClockwiseSlowToFast">Rotation(CW): Slow -&gt; Fast</Capability>
  <Capability Min="188" Max="255" Preset="RotationCounterClockwiseSlowToFast">Rotation(CCW): Slow -&gt; Fast</Capability>
 </Channel>
 <Channel Name="Gobo Rotation (2)">
  <Group Byte="0">Gobo</Group>
  <Capability Min="0" Max="127">Gobo Position</Capability>
  <Capability Min="128" Max="192" Preset="RotationClockwiseFastToSlow">Gobo Rotation(CW): Fast -&gt; Slow</Capability>
  <Capability Min="193" Max="255" Preset="RotationCounterClockwiseSlowToFast">Gobo Rotation(CCW): Slow -&gt; Fast</Capability>
 </Channel>
 <Channel Name="Iris (Custom)">
  <Group Byte="0">Shutter</Group>
  <Capability Min="0" Max="127">Iris Position</Capability>
  <Capability Min="128" Max="192" Preset="PulseSlowToFast">Iris Pulse Opening: Slow -&gt; Fast</Capability>
  <Capability Min="193" Max="255" Preset="PulseSlowToFast">Iris Pulse Closing: Slow -&gt; Fast</Capability>
 </Channel>
 <Channel Name="Prism">
  <Group Byte="0">Prism</Group>
  <Capability Min="0" Max="127" Preset="PrismEffectOff">Open</Capability>
  <Capability Min="128" Max="255" Preset="PrismEffectOn" Res1="0">Prism</Capability>
 </Channel>
 <Channel Name="Prism Rotation (Custom)">
  <Group Byte="0">Prism</Group>
  <Capability Min="0" Max="127">Prism Position</Capability>
  <Capability Min="128" Max="189" Preset="RotationClockwiseFastToSlow">Prism Rotation(CW): Fast -&gt; Slow</Capability>
  <Capability Min="190" Max="193">Prism Static</Capability>
  <Capability Min="194" Max="255" Preset="RotationCounterClockwiseSlowToFast">Prism Rotation(CCW): Slow -&gt; Fast</Capability>
 </Channel>
 <Channel Name="Frost">
  <Group Byte="0">Effect</Group>
  <Capability Min="0" Max="127">Frost Open</Capability>
  <Capability Min="128" Max="255">Frost In</Capability>
 </Channel>
 <Channel Name="Focus" Preset="BeamFocusFarNear"/>
 <Channel Name="Focus fine" Preset="BeamFocusFine"/>
 <Channel Name="Zoom" Preset="BeamZoomSmallBig"/>
 <Channel Name="Zoom fine" Preset="BeamZoomFine"/>
 <Channel Name="Autofocus (Custom)">
  <Group Byte="0">Nothing</Group>
  <Capability Min="0" Max="255">beam AF</Capability>
 </Channel>
 <Channel Name="System Control">
  <Group Byte="0">Maintenance</Group>
  <Capability Min="0" Max="119">Unused</Capability>
  <Capability Min="120" Max="160" Preset="ResetPanTilt">Pan and tilt reset</Capability>
  <Capability Min="161" Max="200" Preset="ResetMotors">Head reset</Capability>
  <Capability Min="201" Max="255" Preset="ResetAll">All reset</Capability>
 </Channel>
 <Channel Name="Dimmer" Preset="IntensityMasterDimmer"/>
 <Mode Name="Standard">
  <Channel Number="0">Pan</Channel>
  <Channel Number="1">Pan Fine</Channel>
  <Channel Number="2">Tilt</Channel>
  <Channel Number="3">Tilt Fine</Channel>
  <Channel Number="4">Pan speed</Channel>
  <Channel Number="5">Dimmer</Channel>
  <Channel Number="6">Strobe (Custom)</Channel>
  <Channel Number="7">Cyan</Channel>
  <Channel Number="8">Magenta</Channel>
  <Channel Number="9">Yellow</Channel>
  <Channel Number="10">Color1</Channel>
  <Channel Number="11">Color2</Channel>
  <Channel Number="12">Color3</Channel>
  <Channel Number="13">Static Gobo</Channel>
  <Channel Number="14">Rotating Gobo</Channel>
  <Channel Number="15">Gobo Rotation (2)</Channel>
  <Channel Number="16">Iris (Custom)</Channel>
  <Channel Number="17">Prism</Channel>
  <Channel Number="18">Prism Rotation (Custom)</Channel>
  <Channel Number="19">Frost</Channel>
  <Channel Number="20">Focus</Channel>
  <Channel Number="21">Focus fine</Channel>
  <Channel Number="22">Zoom</Channel>
  <Channel Number="23">Zoom fine</Channel>
  <Channel Number="24">Autofocus (Custom)</Channel>
  <Channel Number="25">System Control</Channel>
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
   <Channel>25</Channel>
  </Head>
 </Mode>
 <Physical>
  <Bulb Type="LED" Lumens="9" ColourTemperature="1"/>
  <Dimensions Weight="12" Width="260" Height="678" Depth="438"/>
  <Lens Name="Other" DegreesMin="9" DegreesMax="40"/>
  <Focus Type="Head" PanMax="541" TiltMax="273"/>
  <Layout Width="6" Height="1"/>
  <Technical PowerConsumption="0" DmxConnector="Other"/>
 </Physical>
</FixtureDefinition>
$qxf$,
  now(), now()
);
