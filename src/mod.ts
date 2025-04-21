import * as sprite_data from "./data/sprite-data.ts";

let webNoteAudioContext: AudioContext;
let webNoteAudioSprite: AudioBuffer | undefined;
const webNoteAudioBuffers: Record<
  string,
  { buffer: AudioBufferSourceNode; gain: GainNode }
> = {};

export function initWebNotePlayer(
  listenerElement: EventTarget = document.body, // Use EventTarget for broader compatibility
  audioContext: AudioContext = new AudioContext(),
): void {
  try {
    webNoteAudioContext = audioContext;
    loadAudioSpriteFromData(sprite_data.spriteData).then(() => {
      listenerElement.dispatchEvent(
        new CustomEvent("web-note-player-ready", {
          bubbles: true,
        }),
      );
    });
    addWebNoteListeners(listenerElement);
  } catch (error) {
    console.error(error);
  }
}

async function loadAudioSpriteFromData(
  audioSpriteData: { url: string } = sprite_data.spriteData,
): Promise<void> {
  try {
    if (!webNoteAudioContext) {
      throw new Error("AudioContext not initialized.");
    }
    const sprite = await fetch(audioSpriteData.url);
    const arrayBuffer = await sprite.arrayBuffer();
    webNoteAudioSprite = await webNoteAudioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    throw new Error(error);
  }
}

interface WebNoteOnEventDetail {
  instrumentAudio: string;
  midiNoteNumber: number;
  uuid?: string;
  noteDuration?: number;
  noteVolume?: number;
  noteDelay?: number;
}

type WebNoteOnCustomEvent = CustomEvent<WebNoteOnEventDetail>;
type WebNoteOffCustomEvent = CustomEvent<{ uuid: string }>;

function addWebNoteListeners(listenerElement: EventTarget): void {
  listenerElement.addEventListener(
    "web-note-player-on",
    ((
      event: WebNoteOnCustomEvent,
    ) => {
      webNoteOn(
        event.detail.instrumentAudio,
        event.detail.midiNoteNumber,
        event.detail.uuid,
        event.detail.noteDuration,
        event.detail.noteVolume,
        event.detail.noteDelay,
      );
    }) as EventListenerOrEventListenerObject,
  );

  listenerElement.addEventListener(
    "web-note-player-off",
    ((
      event: WebNoteOffCustomEvent,
    ) => {
      webNoteOff(event.detail.uuid);
    }) as EventListenerOrEventListenerObject,
  );
}

function getClosestSpriteNoteData(
  instrumentAudio: string,
  midiNoteNumber: number,
): sprite_data.SpriteInstrumentNote {
  let instrumentData: sprite_data.SpriteInstrumentNote[] | undefined;
  if (sprite_data.spriteData.instruments[instrumentAudio] != null) {
    instrumentData = sprite_data.spriteData.instruments[instrumentAudio];
  } else {
    throw new TypeError(
      `invalid attribute value: instrument-audio = ${instrumentAudio}`,
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

function webNoteOn(
  instrumentAudio: string,
  midiNoteNumber: number,
  uuid: string | undefined = undefined,
  noteDuration: number = 5,
  noteVolume: number = 0.6,
  noteDelay: number = 0,
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
        midiNoteNumber,
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
          `no midi note number in the audio sprite's ${instrumentAudio} data is within an octave of ${midiNoteNumber}`,
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
          noteDuration,
        );
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function webNoteOff(uuid: string): void {
  if (uuid && webNoteAudioBuffers[uuid] && webNoteAudioContext) {
    const currentTime = webNoteAudioContext.currentTime;
    webNoteAudioBuffers[uuid].gain.gain.cancelScheduledValues(0);
    webNoteAudioBuffers[uuid].gain.gain.setTargetAtTime(0, currentTime, 0.05);
    webNoteAudioBuffers[uuid].buffer.stop(currentTime + 0.1);
    delete webNoteAudioBuffers[uuid];
  }
}
