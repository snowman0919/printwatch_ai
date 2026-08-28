# PrintWatch Pi 4 housing

`printwatch_housing.py` generates five printable solids, STEP files, and one editable FreeCAD document.

```bash
PRINTWATCH_CAD_OUT="$PWD/out" FreeCADCmd printwatch_housing.py
```

Default hardware:

- Raspberry Pi 4 Model B, 85 × 56 mm board and 58 × 49 mm hole pattern
- Raspberry Pi Camera Module 2, 25 × 24 mm board
- common SSD1306 0.96-inch I2C board, approximately 27.5 × 27.8 mm, address `0x3C`
- Ender-3 V3 SE gantry attachment using two M5 × 8 screws and matching T-nuts

Print in PETG or ABS near the printer. Use 0.2 mm layers, four walls, 25% infill, and supports only below the camera-pod hinge ears. The base, lid, arm, and mounting plate already lie on printable flat faces. Measure the actual OLED board and verify gantry clearance before printing all three sets.

Assembly hardware per printer: four M2.5 × 6 screws for Pi, four M2 screws for OLED, four M3 × 10 case screws, one M3 × 20 camera hinge screw with locknut, and two M5 × 8 screws with T-nuts.
