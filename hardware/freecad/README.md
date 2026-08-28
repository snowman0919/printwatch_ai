# PrintWatch Pi 4 housing

`printwatch_housing.py` generates six printable solids, STEP files, and one editable FreeCAD document.

```bash
./build.sh
```

`build.sh` uses an installed `FreeCADCmd` first. If it is unavailable, it runs the same script in a digest-pinned FreeCAD container and writes only to `out/`.

Default hardware:

- Raspberry Pi 4 Model B, 85 × 56 mm board and 58 × 49 mm hole pattern
- Raspberry Pi Camera Module 2, 25 × 24 mm board
- supplied 0.96-inch I2C OLED envelope, 26 × 26 mm with a 21.74 × 10.86 mm active area and four pins
- Ender-3 V3 SE fixed Z-upright attachment using two 12 mm reusable straps or stainless clamps

The lid rim and OLED pocket use 0.20 mm clearance on each mating side; nominal M3 clearance holes are 3.20 mm. Print in PETG or ABS near the printer. Use 0.2 mm layers, four walls, 25% infill, and supports only below the camera-pod hinge ears. The base, lid, retainer, arm, and mounting plate already lie on printable flat faces. Print one set and verify the physical OLED board and fixed-upright clearance before printing all three sets.

Press the four M3 heat-set inserts into the enclosure-facing side of `ender_v3se_fixed_upright_mount`; its 2 mm standoffs keep both straps clear of the enclosure. Mount it on the outside face of either fixed Z upright, never on the X gantry or bed carriage. The countersunk M3 × 6 screws sit flush inside the Pi enclosure.

Slide the OLED into the three-sided rail with its four-pin header toward the open side, then secure `oled_retainer` with one M2 × 6 self-tapping screw. Assembly hardware per printer: four M2.5 × 6 screws for Pi, one M2 × 6 OLED-retainer screw, four M3 × 10 lid screws, four countersunk M3 × 6 mounting-plate screws with four 4 mm M3 heat-set inserts, one M3 × 20 camera hinge screw with locknut, and two 12 mm straps or clamps sized for the selected upright.
