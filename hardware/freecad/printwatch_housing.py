"""Generate a printable Raspberry Pi 4 + OLED + Camera Module 2 enclosure.

Run: FreeCADCmd printwatch_housing.py [output-directory]
All dimensions are millimetres. Tune the constants below after measuring the
specific OLED breakout and printer extrusion before the final production run.
"""
from pathlib import Path
import os
import sys
import FreeCAD as App
import Part
import MeshPart

OUT = Path(os.environ.get("PRINTWATCH_CAD_OUT", "out")).resolve()
OUT.mkdir(parents=True, exist_ok=True)

WALL = 2.4
CLEARANCE = 0.35
CASE_X, CASE_Y, CASE_Z = 104.0, 76.0, 34.0
PI_HOLE_X, PI_HOLE_Y = 58.0, 49.0
OLED_BOARD_X, OLED_BOARD_Y = 27.5, 27.8
OLED_WINDOW_X, OLED_WINDOW_Y = 22.4, 11.5
CAMERA_BOARD_X, CAMERA_BOARD_Y = 25.0, 24.0
CAMERA_HOLE_X, CAMERA_HOLE_Y = 21.0, 12.5
MOUNT_PLATE_X, MOUNT_PLATE_Y = 82.0, 34.0
CASE_MOUNT_X, CASE_MOUNT_Y = (27.0, 82.0), (27.0, 49.0)


def rounded_box(x, y, z, radius=3.0):
    core_x = Part.makeBox(x - 2 * radius, y, z, App.Vector(radius, 0, 0))
    core_y = Part.makeBox(x, y - 2 * radius, z, App.Vector(0, radius, 0))
    result = core_x.fuse(core_y)
    for cx in (radius, x - radius):
        for cy in (radius, y - radius):
            result = result.fuse(Part.makeCylinder(radius, z, App.Vector(cx, cy, 0)))
    return result


def slot(length, diameter, depth, center):
    radius = diameter / 2
    body = Part.makeBox(length, diameter, depth, App.Vector(center.x - length / 2, center.y - radius, center.z))
    return body.fuse(Part.makeCylinder(radius, depth, App.Vector(center.x - length / 2, center.y, center.z))).fuse(Part.makeCylinder(radius, depth, App.Vector(center.x + length / 2, center.y, center.z)))


def base():
    outer = rounded_box(CASE_X, CASE_Y, CASE_Z, 4)
    inner = rounded_box(CASE_X - 2 * WALL, CASE_Y - 2 * WALL, CASE_Z, 2.2)
    inner.translate(App.Vector(WALL, WALL, WALL))
    shape = outer.cut(inner)
    # USB/Ethernet end and power/HDMI side access. Generous cut-outs cover Pi 4 revisions.
    shape = shape.cut(Part.makeBox(WALL + 2, 52, 20, App.Vector(CASE_X - WALL - 1, 12, 7)))
    shape = shape.cut(Part.makeBox(58, WALL + 2, 17, App.Vector(16, -1, 7)))
    # CSI ribbon and GPIO/OLED cable exits.
    shape = shape.cut(Part.makeBox(18, WALL + 2, 5, App.Vector(76, CASE_Y - WALL - 1, 20)))
    shape = shape.cut(Part.makeBox(12, 8, WALL + 2, App.Vector(82, 58, -1)))
    # Bottom vents stay bridge-free when the base prints in its normal orientation.
    for x in range(20, 86, 11):
        shape = shape.cut(Part.makeBox(5, 38, WALL + 2, App.Vector(x, 20, -1)))
    # Four M3 seats mate the enclosure to the Ender extrusion plate.
    for x in CASE_MOUNT_X:
        for y in CASE_MOUNT_Y:
            shape = shape.fuse(Part.makeCylinder(4.5, 4.0, App.Vector(x, y, 0)))
            shape = shape.cut(Part.makeCylinder(1.7, 6.0, App.Vector(x, y, -1)))
            shape = shape.cut(Part.makeCone(1.7, 3.4, 1.7, App.Vector(x, y, 2.3)))
    # Pi 4 mounting bosses: board origin 9 mm from the enclosure corner.
    for x in (12.5, 12.5 + PI_HOLE_X):
        for y in (12.5, 12.5 + PI_HOLE_Y):
            boss = Part.makeCylinder(3.5, 5, App.Vector(x, y, WALL))
            hole = Part.makeCylinder(1.45, 7, App.Vector(x, y, WALL - 1))
            shape = shape.fuse(boss).cut(hole)
    # Four lid screw pillars.
    for x, y in ((7, 7), (CASE_X - 7, 7), (7, CASE_Y - 7), (CASE_X - 7, CASE_Y - 7)):
        pillar = Part.makeCylinder(4.2, CASE_Z - WALL, App.Vector(x, y, WALL))
        hole = Part.makeCylinder(1.35, CASE_Z, App.Vector(x, y, WALL))
        shape = shape.fuse(pillar).cut(hole)
    return shape


def lid():
    plate = rounded_box(CASE_X, CASE_Y, WALL, 4)
    rim = rounded_box(CASE_X - 2 * (WALL + CLEARANCE), CASE_Y - 2 * (WALL + CLEARANCE), 3.0, 2)
    rim.translate(App.Vector(WALL + CLEARANCE, WALL + CLEARANCE, WALL))
    rim_inner = rounded_box(CASE_X - 4 * WALL, CASE_Y - 4 * WALL, 3.2, 1)
    rim_inner.translate(App.Vector(2 * WALL, 2 * WALL, WALL - 0.1))
    shape = plate.fuse(rim.cut(rim_inner))
    # OLED opening and M2 mounting holes for common 27.5 x 27.8 mm boards.
    oled_center = App.Vector(76, 38, -1)
    shape = shape.cut(Part.makeBox(OLED_WINDOW_X, OLED_WINDOW_Y, WALL + 2, App.Vector(oled_center.x - OLED_WINDOW_X / 2, oled_center.y - OLED_WINDOW_Y / 2, -1)))
    for dx in (-OLED_BOARD_X / 2 + 2.0, OLED_BOARD_X / 2 - 2.0):
        for dy in (-OLED_BOARD_Y / 2 + 2.0, OLED_BOARD_Y / 2 - 2.0):
            shape = shape.cut(Part.makeCylinder(1.1, WALL + 2, App.Vector(oled_center.x + dx, oled_center.y + dy, -1)))
    for x, y in ((7, 7), (CASE_X - 7, 7), (7, CASE_Y - 7), (CASE_X - 7, CASE_Y - 7)):
        shape = shape.cut(Part.makeCylinder(1.55, WALL + 2, App.Vector(x, y, -1)))
    return shape


def camera_pod():
    x, y, z = 33.0, 32.0, 8.0
    outer = rounded_box(x, y, z, 3)
    inner = Part.makeBox(x - 2 * WALL, y - 2 * WALL, z, App.Vector(WALL, WALL, WALL))
    shape = outer.cut(inner)
    center = App.Vector(x / 2, y / 2, -1)
    shape = shape.cut(Part.makeCylinder(5.0, WALL + 2, center))
    for dx in (-CAMERA_HOLE_X / 2, CAMERA_HOLE_X / 2):
        for dy in (-CAMERA_HOLE_Y / 2, CAMERA_HOLE_Y / 2):
            shape = shape.cut(Part.makeCylinder(1.1, WALL + 2, App.Vector(center.x + dx, center.y + dy, -1)))
    shape = shape.cut(Part.makeBox(17, WALL + 2, 4, App.Vector(8, y - WALL - 1, 2)))
    # Hinge ears accept an M3 bolt and let the camera aim at the build plate.
    for ear_x in (4.5, x - 4.5):
        ear = Part.makeBox(5, 6, 10, App.Vector(ear_x - 2.5, y, 0)).fuse(Part.makeCylinder(5, 5, App.Vector(ear_x, y + 6, 5), App.Vector(1, 0, 0)))
        ear = ear.cut(Part.makeCylinder(1.65, 7, App.Vector(ear_x - 3, y + 6, 5), App.Vector(1, 0, 0)))
        shape = shape.fuse(ear)
    return shape


def camera_arm():
    shape = rounded_box(70, 16, 5, 3)
    for x in (8, 62):
        shape = shape.cut(Part.makeCylinder(1.65, 7, App.Vector(x, 8, -1)))
    return shape


def extrusion_mount():
    # Two horizontal slots accept M5 screws/T-nuts on common Ender gantry profiles.
    plate = rounded_box(MOUNT_PLATE_X, MOUNT_PLATE_Y, 5, 3)
    for x in (21, 61):
        plate = plate.cut(slot(9, 5.5, 7, App.Vector(x, 17, -1)))
    # Translate the enclosure's shared M3 pattern into the centered plate coordinates.
    offset_x = (CASE_X - MOUNT_PLATE_X) / 2
    offset_y = (CASE_Y - MOUNT_PLATE_Y) / 2
    for x in CASE_MOUNT_X:
        for y in CASE_MOUNT_Y:
            plate = plate.cut(Part.makeCylinder(2.05, 7, App.Vector(x - offset_x, y - offset_y, -1)))
    return plate


parts = {"pi4_oled_base": base(), "pi4_oled_lid": lid(), "camera_module_2_pod": camera_pod(), "camera_tilt_arm": camera_arm(), "ender_v3se_mount": extrusion_mount()}
doc = App.newDocument("PrintWatchHousing")
for name, shape in parts.items():
    if shape.isNull() or not shape.isValid() or shape.Volume <= 0:
        raise RuntimeError(f"Invalid generated solid: {name}")
    obj = doc.addObject("PartDesign::Feature", name)
    obj.Label = name.replace("_", " ").title()
    obj.Shape = shape
    mesh = MeshPart.meshFromShape(Shape=shape, LinearDeflection=0.12, AngularDeflection=0.35, Relative=False)
    if mesh.CountFacets < 12:
        raise RuntimeError(f"Mesh too small: {name}")
    mesh.write(str(OUT / f"{name}.stl"))
    shape.exportStep(str(OUT / f"{name}.step"))
    print(f"{name}: volume={shape.Volume:.1f}mm3 facets={mesh.CountFacets}")
doc.recompute()
doc.saveAs(str(OUT / "printwatch_housing.FCStd"))
print(f"Wrote {len(parts)} printable parts to {OUT}")
