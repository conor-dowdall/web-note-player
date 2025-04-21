# Web Note Player

A lightweight JavaScript module for playing audio sprite sounds triggered by
custom events.

**Features:**

- Initializes a Web Audio context and loads an audio sprite.
- Plays specific sounds from the sprite based on `web-note-player-on` custom
  events, specifying instrument, MIDI note number, and optional duration,
  volume, and delay.
- Supports looping sounds.
- Allows stopping currently playing sounds using `web-note-player-off` events.
- Handles cross-browser audio playback (though some browser-specific behaviors
  may exist).

**Dependencies:**

- An audio sprite file (e.g., `sprite.ogg`).
- A `sprite-data.ts` file defining the sprite's metadata (URLs and
  instrument/note timings).

**Example:**

See the examples/ directory.
