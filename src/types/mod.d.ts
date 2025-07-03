/**
 * Type definitions for the WebNotePlayer module.
 * This file defines the interfaces and types used for the custom events
 * and data structures within the WebNotePlayer system, ensuring type safety
 * across different parts of the application.
 * @module web-note-player-types
 */

/**
 * Interface for the collection of instruments within the audio sprite data.
 * Each key is an instrument name, and its value is an array of `AudioSpriteNoteData`.
 * The `AudioSpriteNoteData` arrays for each instrument must be sorted by `midiNoteRangeStart`.
 */
export interface AudioSpriteInstrumentsData {
  /**
   * A string index signature allowing dynamic instrument names.
   * @type {AudioSpriteNoteData[]}
   */
  [key: string]: AudioSpriteNoteData[];
}

/**
 * Interface for the data associated with a single note within an audio sprite,
 * defining the range of MIDI notes it covers.
 *
 * **Important:** Entries in the `instruments` array must be sorted by `midiNoteRangeStart`
 * for efficient lookup.
 */
export interface AudioSpriteNoteData {
  /**
   * The actual MIDI note number (the sampled pitch) of this audio segment.
   * This is used as the base for de-tuning.
   */
  midiNoteNumber: number;
  /**
   * The lowest MIDI note number this audio segment should cover.
   * Inclusive.
   */
  midiNoteRangeStart: number;
  /**
   * The highest MIDI note number this audio segment should cover.
   * Inclusive.
   */
  midiNoteRangeEnd: number;
  /**
   * The start time in seconds of this note's audio segment within the main audio sprite.
   */
  noteStart: number;
  /**
   * The natural duration in seconds of this note's audio segment.
   */
  noteDuration: number;
  /**
   * Optional loop start point in seconds within the note's audio segment.
   * Used for sustained or looping notes.
   * @optional
   */
  loopStart?: number;
  /**
   * Optional loop end point in seconds within the note's audio segment.
   * Used for sustained or looping notes.
   * @optional
   */
  loopEnd?: number;
}

/**
 * Interface for the `detail` property of the `web-note-player-on` custom event.
 * This defines the payload of data sent when a note is requested to start playing.
 */
export interface WebNoteOnEventDetail {
  /**
   * The name of the instrument to play (e.g., "guitar").
   */
  instrumentAudio: string;
  /**
   * The MIDI note number (0-127) to play. The player will find the closest
   * available note in the audio sprite.
   */
  midiNoteNumber: number;
  /**
   * An optional unique identifier for the note instance. Required if `noteDuration`
   * is `undefined` to allow the note to be stopped using `web-note-player-off`.
   * @optional
   */
  uuid?: string;
  /**
   * An optional desired duration of the note in seconds. If `undefined`, the note
   * will attempt to loop indefinitely, requiring a `uuid` for explicit stopping.
   * @default 1
   * @optional
   */
  noteDuration?: number;
  /**
   * An optional volume level for the note, a linear gain value from 0.0 (silent) to 1.0 (full volume).
   * @default 0.6
   * @optional
   */
  noteVolume?: number;
  /**
   * An optional delay in seconds before the note starts playing, relative to the
   * `AudioContext`'s current time.
   * @default 0
   * @optional
   */
  noteDelay?: number;
}

/**
 * Type definition for the `web-note-player-on` custom event.
 * This event is dispatched to request the WebNotePlayer to start playing a note.
 *
 * @template {WebNoteOnEventDetail} T - The type of the `detail` property for this event.
 * @augments {CustomEvent<T>}
 */
export type WebNoteOnCustomEvent = CustomEvent<WebNoteOnEventDetail>;

/**
 * Type definition for the `web-note-player-off` custom event.
 * This event is dispatched to request the WebNotePlayer to stop a previously
 * started note identified by its UUID.
 *
 * @template {{ uuid: string }} T - The type of the `detail` property for this event.
 * @augments {CustomEvent<T>}
 */
export type WebNoteOffCustomEvent = CustomEvent<{ uuid: string }>;
