# 3D library assets

## hdri/studio.exr

Studio HDRI from [Poly Haven](https://polyhaven.com/hdris) (CC0), in the 512 × 256 EXR
(DWAB) version packed by [@pmndrs/assets](https://github.com/pmndrs/assets) 1.7.0
(`hdri/studio.exr`, CC0). Extracted from the package's base64 module, not changed.
Lights the 3D library (`app/lib/cassette3d/scene.ts`).

## Sounds

None: every sound is synthesised in code (`app/lib/cassette3d/audio.ts`), kept as the
real sounds at the Stage 6 checkpoint. To use a recording for one instead, put it in
`sounds/<name>.mp3`, add `<name>` to `SOUND_OVERRIDES` in `audio.ts`, and record its
source and licence here.

| Name | Plays when |
| --- | --- |
| `case-slide` | a case slides out of the shelf / is pushed back in |
| `case-open` | the lid unlatches |
| `case-close` | the lid snaps shut |
| `cassette-clack` | the cassette comes off / goes back on the spindles |
| `cassette-down` | the cassette is put down on the table |
| `paper-slide` | the J-card slides out of / into the lid |
| `paper-unfold` | each crease of the J-card opens or closes |
| `paper-flip` | the unfolded J-card is turned over |
