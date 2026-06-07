models/
-------

This folder holds the textured 3D model(s) for the scene. The loaders
in src/asg5.js look for two files:

    babe.glb         (the ox; loaded by loadBabe)
    paul_bunyan.glb  (the lumberjack; loaded by loadPaulBunyan)

You don't need both. The rubric only requires ONE textured 3D model.
If a file is missing the loader logs a note and the scene keeps going
(babe has a boxy fallback; paul bunyan is just skipped).

Where to get free models
------------------------

The assignment recommends these:

  https://poly.pizza/      (search "ox", "cow", "bull", "lumberjack", etc.)
  https://free3d.com/

Look for .glb (recommended) or .gltf models. Download one, rename it to
match the filename above, and drop it in this folder.

Adjusting size and position
---------------------------

If a model loads but looks too big or rotated wrong, edit these lines
near the bottom of src/asg5.js:

    loadBabe:
        babe.position.set(3, 0, 5);
        babe.scale.set(1.5, 1.5, 1.5);

    loadPaulBunyan:
        paul.position.set(-2, 0, 3);
        paul.scale.set(2.0, 2.0, 2.0);
        paul.rotation.y = Math.PI * 0.25;

Position is (x, y, z) in world units. Scale is uniform multiplier.
Rotation.y is in radians, so Math.PI = 180 degrees.
