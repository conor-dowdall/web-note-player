/**
 * Provides the core functionality for the WebNotePlayer,
 * a module that handles audio playback based on custom events.
 * It manages the AudioContext, loads audio sprites, and plays/stops
 * musical notes, supporting dynamic volume, duration, and looping.
 *
 * @example
 * See `examples/` directory
 *
 * @module web-note-player
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API Web Audio API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioContext AudioContext}
 */

import type {
  AudioSpriteInstrumentsData,
  AudioSpriteNoteData,
  WebNoteOffCustomEvent,
  WebNoteOnCustomEvent,
} from "./types/mod.d.ts";

/**
 * The global AudioContext instance used for all audio operations.
 * It is initialized by `initWebNotePlayer`.
 */
let webNoteAudioContext: AudioContext | null = null;

/**
 * The list of instruments and their data, stored in the audio sprite.
 * Loaded by `initWebNotePlayer`.
 */
let audioSpriteInstrumentsData: AudioSpriteInstrumentsData | null = null;

/**
 * The decoded AudioBuffer containing the entire audio sprite.
 * Loaded by `loadAudioSpriteFromUrl`.
 */
let audioSpriteBuffer: AudioBuffer | null = null;

/**
 * A record mapping unique note UUIDs to their active AudioBufferSourceNode
 * and GainNode instances. This allows for individual control (e.g., stopping)
 * of currently playing notes.
 */
const webNoteAudioBuffers: Record<
  string,
  { buffer: AudioBufferSourceNode; gain: GainNode }
> = {};

/**
 * The time constant used for gain envelope shaping, particularly for fading
 * notes out to prevent clicks. A smaller value means a faster fade.
 * @constant
 */
const GAIN_TIME_CONSTANT = 0.05;

/**
 * An additional duration added to notes to ensure a clean fade-out
 * and prevent abrupt audio stops.
 * @constant
 */
const EXTRA_NOTE_DURATION = 0.3;

/**
 * Initializes the WebNotePlayer.
 *
 * This function sets up the global `AudioContext`, asynchronously loads the
 * main audio sprite from the specified data, and attaches event listeners
 * to the provided `listenerElement`. Once the audio sprite is loaded,
 * a `web-note-player-ready` custom event is dispatched.
 *
 * @param {string} audioSpriteUrl - An string containing the URL of the audio
 * sprite to be loaded. This is a required parameter.
 * @param {AudioSpriteInstrumentsData} audioSpriteData - An object containing the
 * metadata for the audio sprite to be loaded. This is a required parameter.
 * @param {EventTarget} [listenerElement=document.body] - The EventTarget to attach
 * 'web-note-player-on' and 'web-note-player-off' event listeners to.
 * Defaults to `document.body`.
 * @param {AudioContext} [audioContext=new AudioContext()] - The `AudioContext`
 * instance to use. If not provided, a new `AudioContext` is created.
 * @returns {void}
 * @fires {CustomEvent<void>} web-note-player-ready - Dispatched from `listenerElement`
 * when the audio sprite has been successfully loaded and decoded.
 */
export function initWebNotePlayer(
  audioSpriteUrl: string,
  audioSpriteData: AudioSpriteInstrumentsData,
  listenerElement: EventTarget = document.body,
  audioContext: AudioContext = new AudioContext(),
): void {
  try {
    if (!audioSpriteUrl) throw Error("audioSpriteUrl is not defined");
    if (!audioSpriteData) throw Error("audioSpriteData is not defined");
    webNoteAudioContext = audioContext;
    loadAudioSpriteFromUrl(audioSpriteUrl).then(() => {
      audioSpriteInstrumentsData = audioSpriteData;
      addWebNotePlayerListeners(listenerElement);
      listenerElement.dispatchEvent(
        new CustomEvent("web-note-player-ready", {
          bubbles: true,
        }),
      );
    });
  } catch (error) {
    console.error(error);
  }
}

/**
 * Loads an audio sprite from a URL and decodes it into an AudioBuffer.
 *
 * This asynchronous function fetches the audio file specified in `audioSpriteUrl`,
 * converts it into an ArrayBuffer, and then decodes it using the `webNoteAudioContext`.
 * The resulting `AudioBuffer` is stored in `audioSpriteBuffer`.
 *
 * @async
 * @param {string} audioSpriteUrl - A string containing the URL of the audio sprite.
 * @returns {Promise<void>} A Promise that resolves when the audio sprite is successfully
 * loaded and decoded.
 * @throws {Error} If `webNoteAudioContext` is not initialized before calling this function,
 * or if there is an error during the fetch or audio decoding process.
 */
async function loadAudioSpriteFromUrl(audioSpriteUrl: string): Promise<void> {
  try {
    if (!webNoteAudioContext) throw new Error("AudioContext not initialized.");

    const spriteResponse = await fetch(audioSpriteUrl);
    if (!spriteResponse.ok) {
      throw new Error(
        `Failed to fetch audio sprite: ${spriteResponse.statusText} (${spriteResponse.status})`,
      );
    }

    const arrayBuffer = await spriteResponse.arrayBuffer();
    audioSpriteBuffer = await webNoteAudioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    throw new Error((error as Error).message || "Error loading audio sprite");
  }
}

/**
 * Attaches event listeners for custom 'web-note-player-on' and 'web-note-player-off' events
 * to the specified `listenerElement`.
 *
 * These listeners trigger the `webNotePlayerOn` and `webNotePlayerOff` functions respectively,
 * enabling external control over audio playback.
 *
 * @private
 * @param {EventTarget} listenerElement - The EventTarget (e.g., `document.body` or a custom element)
 * to which the event listeners will be attached.
 * @returns {void}
 */
function addWebNotePlayerListeners(listenerElement: EventTarget): void {
  // web-note-player-on
  listenerElement.addEventListener(
    "web-note-player-on",
    ((
      event: WebNoteOnCustomEvent,
    ) => {
      webNotePlayerOn(
        event.detail.instrumentAudio,
        event.detail.midiNoteNumber,
        event.detail.uuid,
        event.detail.noteDuration,
        event.detail.noteVolume,
        event.detail.noteDelay,
      );
    }) as EventListenerOrEventListenerObject,
  );

  // web-note-player-off
  listenerElement.addEventListener(
    "web-note-player-off",
    ((
      event: WebNoteOffCustomEvent,
    ) => {
      webNotePlayerOff(event.detail.uuid);
    }) as EventListenerOrEventListenerObject,
  );
}

/**
 * Retrieves the `AudioSpriteNoteData` for the given `midiNoteNumber` for a specific instrument.
 * It performs a binary search on the instrument's `SpriteNoteData` array,
 * which *must* be sorted by `midiNoteRangeStart`.
 *
 * This function handles cases where the requested MIDI note number falls below the
 * `midiNoteRangeStart` of the first entry or above the `midiNoteRangeEnd` of the last entry,
 * extending the effective range to cover 0-127 MIDI notes if necessary.
 *
 * @param {string} instrumentAudio - The name of the instrument (e.g., "guitar")
 * as defined in `audioSpriteInstruments: AudioSpriteInstruments`.
 * @param {number} midiNoteNumber - The MIDI note number (0-127) for which to find the corresponding sprite data.
 * @returns {AudioSpriteNoteData} The `AudioSpriteNoteData` object that covers the requested `midiNoteNumber`.
 * @throws {TypeError} If the `instrumentAudio` string does not correspond to a
 * defined instrument in `audioSpriteInstruments`.
 * @throws {Error} If instrument data is found, but the array is empty for the given instrument.
 */
function getClosestSpriteNoteData(
  instrumentAudio: string,
  midiNoteNumber: number,
): AudioSpriteNoteData {
  const instrumentData = audioSpriteInstrumentsData?.[instrumentAudio];

  if (instrumentData === undefined) {
    throw new TypeError(
      `Invalid attribute value: instrument-audio = "${instrumentAudio}". No such instrument found in audio sprite data.`,
    );
  }

  if (instrumentData.length === 0) {
    throw new Error(`Instrument data array is empty for "${instrumentAudio}".`);
  }

  let low = 0;
  let high = instrumentData.length - 1;
  let result: AudioSpriteNoteData | undefined;

  // Binary search to find the correct range
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const currentNoteData = instrumentData[mid];

    if (
      midiNoteNumber >= currentNoteData.midiNoteRangeStart &&
      midiNoteNumber <= currentNoteData.midiNoteRangeEnd
    ) {
      result = currentNoteData;
      break; // Found the exact range
    } else if (midiNoteNumber < currentNoteData.midiNoteRangeStart) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // If result is found, return it
  if (result) {
    return result;
  }

  // Handle edge cases for notes outside explicitly defined ranges
  // Case 1: midiNoteNumber is lower than the lowest defined range
  if (midiNoteNumber < instrumentData[0].midiNoteRangeStart) {
    // Extend the first sprite's range down to 0
    return {
      ...instrumentData[0],
      midiNoteRangeStart: 0,
      midiNoteRangeEnd: instrumentData[0].midiNoteRangeEnd, // Keep its original upper bound
    };
  }

  // Case 2: midiNoteNumber is higher than the highest defined range
  if (
    midiNoteNumber > instrumentData[instrumentData.length - 1].midiNoteRangeEnd
  ) {
    // Extend the last sprite's range up to 127
    return {
      ...instrumentData[instrumentData.length - 1],
      midiNoteRangeStart:
        instrumentData[instrumentData.length - 1].midiNoteRangeStart, // Keep its original lower bound
      midiNoteRangeEnd: 127,
    };
  }

  // This case should theoretically not be reached if ranges fully cover 0-127
  // or if the midiNoteNumber falls into a gap between defined ranges.
  // Given the requirement that lowest/highest should cover 0/127,
  // and data is sorted, a match should always be found or fall into the edge cases.
  // As a fallback, return the closest based on absolute difference if no range was found,
  // although with proper ranges, this should be unnecessary.
  console.warn(
    `MIDI note ${midiNoteNumber} not found within any defined range. Falling back to simple closest.`,
  );

  // Fallback to closest if a gap exists (shouldn't if ranges are contiguous)
  let closest = instrumentData[0];
  let minDiff = Math.abs(midiNoteNumber - closest.midiNoteNumber);

  for (let i = 1; i < instrumentData.length; i++) {
    const currentDiff = Math.abs(
      midiNoteNumber - instrumentData[i].midiNoteNumber,
    );
    if (currentDiff < minDiff) {
      minDiff = currentDiff;
      closest = instrumentData[i];
    }
  }
  return closest;
}

/**
 * Plays a musical note using the Web Audio API.
 *
 * This function creates an `AudioBufferSourceNode`, connects it to a `GainNode`,
 * and then to the `AudioContext`'s destination. It determines the correct segment
 * of the audio sprite to play based on the `instrumentAudio` and `midiNoteNumber`.
 *
 * If `noteDuration` is `undefined`, the note will loop indefinitely if `loopStart`
 * and `loopEnd` are defined in the `SpriteNoteData`, and a `uuid` **must** be provided
 * to allow the note to be stopped later via `webNotePlayerOff`.
 * For finite durations, a fade-out is applied to prevent clicks.
 *
 * @param {string} instrumentAudio - The name of the instrument (e.g., "guitar") to play.
 * @param {number} midiNoteNumber - The MIDI note number (e.g., 60 for Middle C) to play.
 * @param {string} [uuid] - A unique identifier for the note instance. **Required** if `noteDuration` is `undefined`
 * to enable stopping the note.
 * @param {number} [noteDuration=1] - The desired duration of the note in seconds.
 * If `undefined`, the note will attempt to loop indefinitely until `webNotePlayerOff` is called.
 * @param {number} [noteVolume=0.6] - The volume of the note, a linear gain value from 0 (silent) to 1 (full volume).
 * @param {number} [noteDelay=0] - The delay in seconds before the note starts playing, relative to the current `AudioContext` time.
 * @returns {void}
 * @throws {Error} If `getClosestSpriteNoteData` fails or `webNoteAudioContext` or `audioSpriteBuffer`
 * is not initialized.
 */
function webNotePlayerOn(
  instrumentAudio: string,
  midiNoteNumber: number,
  uuid: string | undefined = undefined,
  noteDuration: number | undefined = 1,
  noteVolume: number = 0.6,
  noteDelay: number = 0,
): void {
  try {
    if (!webNoteAudioContext) {
      throw Error("The Audio Context was not initialized properly.");
    }

    const buffer = webNoteAudioContext.createBufferSource();
    const gain = webNoteAudioContext.createGain();
    const closestSpriteNoteData = getClosestSpriteNoteData(
      instrumentAudio,
      midiNoteNumber,
    );
    buffer.buffer = audioSpriteBuffer;

    const isLongNote = noteDuration > closestSpriteNoteData.noteDuration ||
      noteDuration === undefined;

    if (
      isLongNote && // must check isLongNote for Chrome bug/feature!
      closestSpriteNoteData.loopStart !== undefined &&
      closestSpriteNoteData.loopEnd !== undefined
    ) {
      buffer.loopStart = closestSpriteNoteData.loopStart;
      buffer.loopEnd = closestSpriteNoteData.loopEnd;
      buffer.loop = true;
    } else {
      buffer.loop = false;
      if (isLongNote) noteDuration = closestSpriteNoteData.noteDuration;
    }

    buffer.connect(gain).connect(webNoteAudioContext.destination);

    buffer.detune.value =
      (midiNoteNumber - closestSpriteNoteData.midiNoteNumber) * 100;

    gain.gain.value = noteVolume;
    const currentTime = webNoteAudioContext.currentTime;
    const noteStartTime = currentTime + noteDelay;

    // must supply uuid, if using undefined/infinite noteDuration
    if (noteDuration === undefined) {
      if (uuid !== undefined) {
        buffer.start(noteStartTime, closestSpriteNoteData.noteStart);
        webNoteAudioBuffers[uuid] = { buffer, gain };
      } else {
        throw Error(
          "a valid uuid must be supplied, if using undefined/infinite noteDuration",
        );
      }
    } else {
      // fade down the gain with a fast time constant
      // and play the note longer than the supplied duration
      // to avoid a non-zero crossing audio pop
      const noteEndTime = noteStartTime + noteDuration;
      gain.gain.setTargetAtTime(0, noteEndTime, GAIN_TIME_CONSTANT);
      buffer.start(
        noteStartTime,
        closestSpriteNoteData.noteStart,
        noteDuration + EXTRA_NOTE_DURATION, // play/fade the note slightly longer than supplied duration
      );
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Stops a currently playing note identified by its unique `uuid`.
 *
 * This function retrieves the `AudioBufferSourceNode` and `GainNode` associated
 * with the given `uuid` and schedules a rapid fade-out (using `GAIN_TIME_CONSTANT`)
 * before stopping the audio source. The note's entry is then removed from
 * `webNoteAudioBuffers`.
 *
 * @private
 * @param {string} uuid - The unique identifier of the note instance to stop.
 * @returns {void}
 */
function webNotePlayerOff(uuid: string): void {
  if (!webNoteAudioContext) {
    console.error("The Audio Context was not initialized properly.");
    return;
  }

  // Check if the UUID exists in the active notes buffer
  if (webNoteAudioBuffers?.[uuid]) {
    const currentTime = webNoteAudioContext.currentTime;
    webNoteAudioBuffers[uuid].gain.gain.cancelScheduledValues(0);
    webNoteAudioBuffers[uuid].gain.gain.setTargetAtTime(
      0,
      currentTime,
      GAIN_TIME_CONSTANT,
    );
    webNoteAudioBuffers[uuid].buffer.stop(currentTime + EXTRA_NOTE_DURATION);
    delete webNoteAudioBuffers[uuid];
  } else {
    // log a warning if an attempt is made to stop a non-existent note
    console.warn(`Attempted to stop non-existent note with UUID: ${uuid}`);
  }
}
