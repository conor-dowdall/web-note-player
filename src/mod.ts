import { spriteData } from "./data/sprite-data.ts";
import type {
  SpriteNoteData,
  WebNoteOffCustomEvent,
  WebNoteOnCustomEvent,
} from "./types/mod.ts";

let webNoteAudioContext: AudioContext;
let webNoteAudioSprite: AudioBuffer;
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
    loadAudioSpriteFromData(spriteData).then(() => {
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
  audioSpriteData: { url: string } = spriteData
): Promise<void> {
  try {
    if (!webNoteAudioContext) {
      throw new Error("AudioContext not initialized.");
    }
    const sprite = await fetch(audioSpriteData.url);
    const arrayBuffer = await sprite.arrayBuffer();
    webNoteAudioSprite = await webNoteAudioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    throw new Error((error as Error).message || "Error loading audio sprite");
  }
}

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
 * @returns {SpriteNoteData} The closest matching note data.
 * @throws {TypeError} If the instrumentAudio is invalid.
 * @throws {Error} If no instrument data is found for the given instrument.
 */
function getClosestSpriteNoteData(
  instrumentAudio: string,
  midiNoteNumber: number
): SpriteNoteData {
  let instrumentData: SpriteNoteData[];
  if (spriteData.instruments[instrumentAudio] != null) {
    instrumentData = spriteData.instruments[instrumentAudio];
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
 * @param {number|undefined} [noteDuration=1] - The duration of the note in seconds (optional).
 * @param {number} [noteVolume=0.6] - The volume of the note (0 to 1) (optional).
 * @param {number} [noteDelay=0] - The delay before the note starts playing in seconds (optional).
 * @returns {void}
 */
function webNoteOn(
  instrumentAudio: string,
  midiNoteNumber: number,
  uuid: string | undefined = undefined,
  noteDuration: number | undefined = 1,
  noteVolume: number = 0.6,
  noteDelay: number = 0
): void {
  try {
    const buffer = webNoteAudioContext.createBufferSource();
    const gain = webNoteAudioContext.createGain();
    const closestSpriteNoteData = getClosestSpriteNoteData(
      instrumentAudio,
      midiNoteNumber
    );
    buffer.buffer = webNoteAudioSprite;

    const isLongNote =
      noteDuration > closestSpriteNoteData.noteDuration ||
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
    if (Math.abs(buffer.detune.value) > 1200) {
      console.warn(
        `no midi note number in the audio sprite's ${instrumentAudio} data is within an octave of ${midiNoteNumber}`
      );
    }

    gain.gain.value = noteVolume;
    const currentTime = webNoteAudioContext.currentTime;

    if (noteDuration === undefined) {
      buffer.start(currentTime + noteDelay, closestSpriteNoteData.noteStart);
      if (uuid) webNoteAudioBuffers[uuid] = { buffer, gain };
    } else {
      const noteStartTime = currentTime + noteDelay;
      const noteEndTime = noteStartTime + 0.1;
      gain.gain.setTargetAtTime(0, noteEndTime, 0.5);
      buffer.start(
        noteStartTime,
        closestSpriteNoteData.noteStart,
        noteDuration
      );
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
  if (webNoteAudioBuffers?.[uuid]) {
    const currentTime = webNoteAudioContext.currentTime;
    webNoteAudioBuffers[uuid].gain.gain.cancelScheduledValues(0);
    webNoteAudioBuffers[uuid].gain.gain.setTargetAtTime(0, currentTime, 0.05);
    webNoteAudioBuffers[uuid].buffer.stop(currentTime + 0.1);
    delete webNoteAudioBuffers[uuid];
  }
}
