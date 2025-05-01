/**
 * Interface for the detail property of the 'web-note-player-on' event.
 */
export interface WebNoteOnEventDetail {
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
export type WebNoteOnCustomEvent = CustomEvent<WebNoteOnEventDetail>;

/**
 * Type for the 'web-note-player-off' CustomEvent.
 */
export type WebNoteOffCustomEvent = CustomEvent<{ uuid: string }>;

export interface SpriteNoteData {
  midiNoteNumber: number;
  noteStart: number;
  noteDuration: number;
  loopStart?: number;
  loopEnd?: number;
}

export interface SpriteInstruments {
  [key: string]: SpriteNoteData[];
}

export interface SpriteData {
  url: string;
  instruments: SpriteInstruments;
}
