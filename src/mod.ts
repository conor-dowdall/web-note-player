/**
 * A module for playing musical notes using audio sprites and the Web Audio API.
 *
 * @example
 * ```bash
 * deno task build
 * ```
 * ```html
 * <!DOCTYPE html>
 *<html lang="en">
 *  <head>
 *    <meta charset="UTF-8" />
 *    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 *    <title>Web Note Player Test</title>
 *    <style>
 *      html {
 *        color-scheme: dark;
 *      }
 *      #play-buttons {
 *        display: flex;
 *        gap: 1rem;
 *      }
 *    </style>
 *  </head>
 *  <body>
 *    <h1>Web Note Player Test</h1>
 *
 *    <div id="audio-status">
 *      <p>Audio status: <span id="audio-status-text">Loading</span></p>
 *      <p id="error-display" style="color: red"></p>
 *    </div>
 *
 *    <div id="play-button-area">
 *      <button class="play-button" data-midi-note-number="48">
 *        Play C4 (Guitar)
 *      </button>
 *      <button class="play-button" data-midi-note-number="50">
 *        Play D4 (Guitar)
 *      </button>
 *      <button class="play-button" data-midi-note-number="52">
 *        Play E4 (Guitar)
 *      </button>
 *    </div>
 *
 *    <script type="module">
 *      import * as web_note_player from "../dist/mod.js";
 *
 *      const audioStatusText = document.getElementById(
 *        "audio-status-text",
 *      );
 *      document.body.addEventListener("web-note-player-ready", () => {
 *        audioStatusText.textContent = "Ready";
 *      });
 *
 *      web_note_player.initWebNotePlayer();
 *
 *      const playButtons = document.querySelectorAll(".play-button");
 *      playButtons.forEach((playButton) => {
 *        playButton.addEventListener("click", () => {
 *          playButton.dispatchEvent(
 *            new CustomEvent("web-note-player-on", {
 *              bubbles: true,
 *              detail: {
 *                instrumentAudio: "guitar",
 *                midiNoteNumber: parseInt(
 *                  playButton.dataset.midiNoteNumber,
 *                ),
 *              },
 *            }),
 *          );
 *        });
 *      });
 *    </script>
 *  </body>
 *</html>
 * ```
 *
 * @module
 */

import * as sprite_data from "./data/sprite-data.ts";

let webNoteAudioContext: AudioContext;
let webNoteAudioSprite: AudioBuffer | undefined;
const webNoteAudioBuffers: Record<
  string,
  { buffer: AudioBufferSourceNode; gain: GainNode }
> = {};

/**
 * Initializes the WebNotePlayer, setting up the audio context,
 * loading the audio sprite, and attaching event listeners.
 *
 * @param {EventTarget} [listenerElement=document.body] - The EventTarget to attach event listeners to.
 * @param {AudioContext} [audioContext=new AudioContext()] - The AudioContext to use.
 * @returns {void}
 */
export function initWebNotePlayer(
  listenerElement: EventTarget = document.body, // Use EventTarget for broader compatibility
  audioContext: AudioContext = new AudioContext()
): void {
  try {
    webNoteAudioContext = audioContext;
    loadAudioSpriteFromData(sprite_data.spriteData).then(() => {
      listenerElement.dispatchEvent(
        new CustomEvent("web-note-player-ready", {
          bubbles: true,
        })
      );
    });
    addWebNoteListeners(listenerElement);
  } catch (error) {
    console.error(error);
  }
}

/**
 * Loads the audio sprite data from a given URL and decodes it.
 *
 * @async
 * @param {{ url: string }} [audioSpriteData=sprite_data.spriteData] - The URL of the audio sprite data.
 * @returns {Promise<void>} A Promise that resolves when the audio sprite is loaded and decoded.
 * @throws {Error} If the AudioContext is not initialized or if there is an error fetching or decoding the audio data.
 */
async function loadAudioSpriteFromData(
  audioSpriteData: { url: string } = sprite_data.spriteData
): Promise<void> {
  try {
    if (!webNoteAudioContext) {
      throw new Error("AudioContext not initialized.");
    }
    const sprite = await fetch(audioSpriteData.url);
    const arrayBuffer = await sprite.arrayBuffer();
    webNoteAudioSprite = await webNoteAudioContext.decodeAudioData(arrayBuffer);
  } catch (error: any) {
    throw new Error(error?.message || "Error loading audio sprite");
  }
}

/**
 * Interface for the detail property of the 'web-note-player-on' event.
 */
interface WebNoteOnEventDetail {
  instrumentAudio: string;
  midiNoteNumber: number;
  uuid?: string;
  noteDuration?: number;
  noteVolume?: number;
  noteDelay?: number;
}

/**
 * Type for the 'web-note-player-on' CustomEvent.
 */
type WebNoteOnCustomEvent = CustomEvent<WebNoteOnEventDetail>;

/**
 * Type for the 'web-note-player-off' CustomEvent.
 */
type WebNoteOffCustomEvent = CustomEvent<{ uuid: string }>;

/**
 * Attaches event listeners for 'web-note-player-on' and 'web-note-player-off' events.
 *
 * @param {EventTarget} listenerElement - The EventTarget to attach the listeners to.
 * @returns {void}
 */
function addWebNoteListeners(listenerElement: EventTarget): void {
  // web-note-player-on
  listenerElement.addEventListener("web-note-player-on", ((
    event: WebNoteOnCustomEvent
  ) => {
    webNoteOn(
      event.detail.instrumentAudio,
      event.detail.midiNoteNumber,
      event.detail.uuid,
      event.detail.noteDuration,
      event.detail.noteVolume,
      event.detail.noteDelay
    );
  }) as EventListenerOrEventListenerObject);

  // web-note-player-off
  listenerElement.addEventListener("web-note-player-off", ((
    event: WebNoteOffCustomEvent
  ) => {
    webNoteOff(event.detail.uuid);
  }) as EventListenerOrEventListenerObject);
}

/**
 * Gets the closest matching note data from the audio sprite for a given instrument and MIDI note number.
 *
 * @param {string} instrumentAudio - The name of the instrument.
 * @param {number} midiNoteNumber - The MIDI note number.
 * @returns {sprite_data.SpriteInstrumentNote} The closest matching note data.
 * @throws {TypeError} If the instrumentAudio is invalid.
 * @throws {Error} If no instrument data is found for the given instrument.
 */
function getClosestSpriteNoteData(
  instrumentAudio: string,
  midiNoteNumber: number
): sprite_data.SpriteInstrumentNote {
  let instrumentData: sprite_data.SpriteInstrumentNote[] | undefined;
  if (sprite_data.spriteData.instruments[instrumentAudio] != null) {
    instrumentData = sprite_data.spriteData.instruments[instrumentAudio];
  } else {
    throw new TypeError(
      `invalid attribute value: instrument-audio = ${instrumentAudio}`
    );
  }

  if (!instrumentData) {
    throw new Error(`Instrument data not found for ${instrumentAudio}`);
  }

  const instrumentDataLength = instrumentData.length;

  for (let i = 0; i < instrumentDataLength; i++) {
    const currentNumber = instrumentData[i].midiNoteNumber;
    if (currentNumber > midiNoteNumber) {
      if (i === 0) {
        return instrumentData[0];
      }
      const previousSpriteNote = instrumentData[i - 1].midiNoteNumber;
      return Math.abs(previousSpriteNote - midiNoteNumber) <=
        Math.abs(currentNumber - midiNoteNumber)
        ? instrumentData[i - 1]
        : instrumentData[i];
    }
  }

  return instrumentData[instrumentDataLength - 1];
}

/**
 * Plays a musical note using the Web Audio API.
 *
 * @param {string} instrumentAudio - The name of the instrument to play.
 * @param {number} midiNoteNumber - The MIDI note number to play.
 * @param {string} [uuid=undefined] - A unique identifier for the note (optional).
 * @param {number} [noteDuration=5] - The duration of the note in seconds (optional).
 * @param {number} [noteVolume=0.6] - The volume of the note (0 to 1) (optional).
 * @param {number} [noteDelay=0] - The delay before the note starts playing in seconds (optional).
 * @returns {void}
 */
function webNoteOn(
  instrumentAudio: string,
  midiNoteNumber: number,
  uuid: string | undefined = undefined,
  noteDuration: number = 5,
  noteVolume: number = 0.6,
  noteDelay: number = 0
): void {
  try {
    if (
      instrumentAudio != null &&
      midiNoteNumber != null &&
      webNoteAudioContext &&
      webNoteAudioSprite
    ) {
      const buffer = webNoteAudioContext.createBufferSource();
      const gain = webNoteAudioContext.createGain();
      const closestSpriteNoteData = getClosestSpriteNoteData(
        instrumentAudio.toLowerCase(),
        midiNoteNumber
      );
      buffer.buffer = webNoteAudioSprite;

      if (
        closestSpriteNoteData.loopStart !== undefined &&
        closestSpriteNoteData.loopEnd !== undefined
      ) {
        buffer.loopStart = closestSpriteNoteData.loopStart;
        buffer.loopEnd = closestSpriteNoteData.loopEnd;
        buffer.loop = true;
      } else {
        buffer.loop = false;
        if (
          noteDuration === 0 ||
          noteDuration > closestSpriteNoteData.noteDuration
        ) {
          noteDuration = closestSpriteNoteData.noteDuration;
        }
      }

      buffer.connect(gain).connect(webNoteAudioContext.destination);

      buffer.detune.value =
        (midiNoteNumber - closestSpriteNoteData.midiNoteNumber) * 100;
      if (Math.abs(buffer.detune.value) > 1200) {
        console.warn(
          `no midi note number in the audio sprite's ${instrumentAudio} data is within an octave of ${midiNoteNumber}`
        );
      }

      gain.gain.value = noteVolume;
      const currentTime = webNoteAudioContext.currentTime;

      if (noteDuration === 0) {
        buffer.start(currentTime + noteDelay, closestSpriteNoteData.noteStart);
        if (uuid) webNoteAudioBuffers[uuid] = { buffer, gain };
      } else {
        const ENDISH_TIME = currentTime + noteDelay + noteDuration * 0.6;
        gain.gain.setTargetAtTime(0, ENDISH_TIME, noteDuration * 0.2);
        buffer.start(
          currentTime + noteDelay,
          closestSpriteNoteData.noteStart,
          noteDuration
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Stops a playing note.
 *
 * @param {string} uuid - The unique identifier of the note to stop.
 * @returns {void}
 */
function webNoteOff(uuid: string): void {
  if (uuid && webNoteAudioBuffers[uuid] && webNoteAudioContext) {
    const currentTime = webNoteAudioContext.currentTime;
    webNoteAudioBuffers[uuid].gain.gain.cancelScheduledValues(0);
    webNoteAudioBuffers[uuid].gain.gain.setTargetAtTime(0, currentTime, 0.05);
    webNoteAudioBuffers[uuid].buffer.stop(currentTime + 0.1);
    delete webNoteAudioBuffers[uuid];
  }
}
