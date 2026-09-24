# 3D library assets

## hdri/studio.exr

Studio HDRI from [Poly Haven](https://polyhaven.com/hdris) (CC0), in the 512 × 256 EXR
(DWAB) version packed by [@pmndrs/assets](https://github.com/pmndrs/assets) 1.7.0
(`hdri/studio.exr`, CC0). Extracted from the package's base64 module, not changed.
Lights the 3D library (`app/lib/cassette3d/scene.ts`).

## sounds/

Empty until the CC0 recordings are chosen. Each file is MP3; a missing file plays a
synthesised stand-in (`app/lib/cassette3d/audio.ts`, `SOUND_FILES`).

| File | Plays when |
| --- | --- |
| `case-slide.mp3` | a case slides out of the shelf / is pushed back in |
| `case-open.mp3` | the lid unlatches |
| `case-close.mp3` | the lid snaps shut |
| `cassette-clack.mp3` | the cassette comes off / goes back on the spindles |
| `cassette-down.mp3` | the cassette is put down on the table |
| `paper-slide.mp3` | the J-card slides out of / into the lid |
| `paper-unfold.mp3` | each crease of the J-card opens or closes |
| `paper-flip.mp3` | the unfolded J-card is turned over |

Short (under a second), trimmed tight to the sound, peaks around −3 dBFS. Record the
source and licence of each file here.
