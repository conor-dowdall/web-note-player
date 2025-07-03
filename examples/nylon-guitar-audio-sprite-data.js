/**
 * Provides comprehensive metadata for the nylon guitar audio sprite.
 *
 * Note: MP3s has timing issues when exported from WAVs.
 *
 * This object specifies the details for each instrument in the audio sprite.
 * Each instrument entry is an array of `AudioSpriteNoteData` (typescript) objects,
 * mapping MIDI note ranges to specific start times, durations,
 * and optional loop points within the sprite.
 *
 * The `midiNoteNumber` represents the actual sampled pitch, which is used for de-tuning.
 */
export const nylonGuitarAudioSpriteData = {
  guitar: [
    {
      midiNoteNumber: 40,
      midiNoteRangeStart: 0, // Covers notes from 0 up to 43
      midiNoteRangeEnd: 43,
      noteStart: 0,
      noteDuration: 4.387845804988662,
      loopStart: 4.372108843537415,
      loopEnd: 4.384240362811791,
    },
    {
      midiNoteNumber: 45,
      midiNoteRangeStart: 44,
      midiNoteRangeEnd: 48,
      noteStart: 5,
      noteDuration: 3.213968253968254,
      loopStart: 8.204263038548753,
      loopEnd: 8.213401360544218,
    },
    {
      midiNoteNumber: 50,
      midiNoteRangeStart: 49,
      midiNoteRangeEnd: 53,
      noteStart: 9,
      noteDuration: 4.537324263038549,
      loopStart: 13.508707482993199,
      loopEnd: 13.535963718820861,
    },
    {
      midiNoteNumber: 55,
      midiNoteRangeStart: 54,
      midiNoteRangeEnd: 58,
      noteStart: 14,
      noteDuration: 2.0015419501133787,
      loopStart: 15.985873015873016,
      loopEnd: 16.001292517006803,
    },
    {
      midiNoteNumber: 59,
      midiNoteRangeStart: 59,
      midiNoteRangeEnd: 62,
      noteStart: 17,
      noteDuration: 1.4187755102040815,
      loopStart: 18.410090702947844,
      loopEnd: 18.418185941043085,
    },
    {
      midiNoteNumber: 64,
      midiNoteRangeStart: 63,
      midiNoteRangeEnd: 67,
      noteStart: 19,
      noteDuration: 0.9084807256235827,
      loopStart: 19.892108843537414,
      loopEnd: 19.904285714285713,
    },
    {
      midiNoteNumber: 69,
      midiNoteRangeStart: 68,
      midiNoteRangeEnd: 70,
      noteStart: 20,
      noteDuration: 0.8397278911564626,
      loopStart: 20.827868480725623,
      loopEnd: 20.83918367346939,
    },
    {
      midiNoteNumber: 71,
      midiNoteRangeStart: 71,
      midiNoteRangeEnd: 75,
      noteStart: 21,
      noteDuration: 0.6138321995464853,
      loopStart: 21.603650793650793,
      loopEnd: 21.613718820861678,
    },
    {
      midiNoteNumber: 76,
      midiNoteRangeStart: 76,
      midiNoteRangeEnd: 83,
      noteStart: 22,
      noteDuration: 0.7136507936507936,
      loopStart: 22.702789115646258,
      loopEnd: 22.713333333333335,
    },
    {
      midiNoteNumber: 84,
      midiNoteRangeStart: 84,
      midiNoteRangeEnd: 127,
      noteStart: 23,
      noteDuration: 0.4495691609977324,
      loopStart: 23.442721088435373,
      loopEnd: 23.44936507936508,
    },
  ],
};
