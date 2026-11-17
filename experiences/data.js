/* Experience definitions: the single source of truth for the hub cards (/experiences/) and for
   each player page (/experiences/<slug>/). To add an experience:
     1. add an entry below,
     2. copy one of the tiny pages (e.g. experiences/alpha-calm/index.html) into experiences/<slug>/,
     3. run `npm test` (test/experiences.test.js checks the entry and the page).

   Fields
     stages   Flicker / modulation rates over the session. Each stage is {hz, frac} where frac is the
              share of the session spent there (fractions add up to 1). One stage = a steady rate.
     light    true: the screen flickers at each stage's rate (needs a screen refresh that is a whole
              multiple of the rate). false: a steady soft glow only.
     audio    mode "am": music whose volume pulses at the stage rate (the original design: for 40 Hz
                        a soft pulse-tone layer is added too, "pulses": true).
              mode "binaural": left and right ears hear tones `hz` apart (headphones needed).
     evidence level is one of: early | small | mixed.  Keep the wording honest: say what the study
              was (mice, small trial, pilot) and what it did NOT show.

   Safety rule (checked by the tests): no flicker rate between 15 and 25 Hz. That is the range
   most likely to trigger seizures in people with photosensitive epilepsy. */
window.EXPERIENCES = [
  {
    slug: '40hz',
    title: '40 Hz Light & Sound',
    tagline: 'Gamma brain-wave rhythm, in light and sound',
    art: { rgb: '255,170,90', big: '40 Hz', small: 'light + sound' },
    minutes: 60,
    light: true,
    stages: [{ hz: 40, frac: 1 }],
    audio: { mode: 'am', pulses: true },
    visualText: '40 Hz flicker',
    soundText: '40 Hz pulsing music plus a soft 40-per-second pulse tone',
    tags: ['Brain-health research'],
    evidence: { level: 'early', label: 'Early: mostly mice, small human studies' },
    overview: 'A soft amber glow and gentle music that pulse together 40 times a second. 40 Hz is in the “gamma” range of brain-wave activity. Start it on your phone and let it run while you rest.',
    why: 'Researchers at MIT and other labs have been studying whether 40 Hz light and sound could support the brain in Alzheimer’s disease and dementia. In mouse models it was linked to less amyloid and tau buildup and better memory. In small, early human studies it was safe and well tolerated, with preliminary signs worth following up.',
    note: 'Most of the evidence is from mice, and the human studies are small. It has not been shown to treat, slow or prevent Alzheimer’s or dementia in people. We offer it as a calming, research-inspired experience for relaxation.',
    studies: [
      { label: 'Iaccarino et al., Nature, 2016', url: 'https://doi.org/10.1038/nature20587', summary: '40 Hz light flicker lowered amyloid in Alzheimer’s mouse models. Mice.' },
      { label: 'Martorell et al., Cell, 2019', url: 'https://pubmed.ncbi.nlm.nih.gov/30879788/', summary: 'Light plus sound reduced amyloid and tau and improved memory in mice.' },
      { label: 'Murdock et al., Nature, 2024', url: 'https://pubmed.ncbi.nlm.nih.gov/38418876/', summary: 'Helped the brain’s waste-clearing pathways remove amyloid in mice.' },
      { label: 'Chan et al., PLOS ONE, 2022', url: 'https://doi.org/10.1371/journal.pone.0278412', summary: 'Early human study: safe and well tolerated; 15 people with mild Alzheimer’s showed preliminary, exploratory signs. Small trial.' }
    ]
  },
  {
    slug: 'alpha-calm',
    title: 'Alpha Calm',
    tagline: 'A 10 Hz glow and pulse for unwinding',
    art: { rgb: '255,196,110', big: '10 Hz', small: 'light + sound' },
    minutes: 30,
    light: true,
    stages: [{ hz: 10, frac: 1 }],
    audio: { mode: 'am', pulses: false },
    visualText: '10 Hz flicker',
    soundText: '10 Hz pulsing music (the volume swells and fades 10 times a second)',
    tags: ['Stress & mood', 'Sleep prep'],
    evidence: { level: 'small', label: 'Small human studies' },
    overview: 'Soft amber light and gentle music pulse together ten times a second. 10 Hz is the “alpha” rhythm, linked with relaxed, wakeful rest. Settle in with your eyes closed (you will still see the glow) or softly open, and let your mind slow down.',
    why: 'Small studies have looked at 10 Hz alpha stimulation for stress, mood, sleep and pain. In a randomized trial of healthy adults, 20 minutes a day of 10 Hz sound for three weeks was followed by lower self-reported stress, anxiety and depression, and better sleep. In a small crossover trial in people with fibromyalgia, two weeks of 10 Hz light or sound before bed was followed by less night-time pain and better sleep than a sham. In mice, alpha flicker had antidepressant-like effects.',
    note: 'These studies are small, one was in mice, and one was a feasibility study. Results are mixed: a 2024 study found 10 Hz flicker changed brain signals but did not improve an attention task. This is not a treatment for depression, anxiety, pain or sleep problems.',
    studies: [
      { label: 'Kanzler et al., Exploration of Neuroprotective Therapy, 2023', url: 'https://explorationpub.com/Journals/ent/Article/100464', summary: '20 min a day for 21 days of 10 Hz sound in healthy adults was followed by lower stress, anxiety and depression scores and better sleep. Sound only.' },
      { label: 'Halpin et al., The Journal of Pain, 2025', url: 'https://eprints.whiterose.ac.uk/id/eprint/225359', summary: 'Fibromyalgia: two weeks of 10 Hz light or sound before sleep, night-time pain fell about half a point on a 0 to 10 scale versus sham. Small feasibility trial.' },
      { label: 'Rhythmical photic stimulation at alpha frequencies, PLOS ONE, 2016', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4699699/', summary: 'Alpha-frequency flicker had antidepressant-like effects in a mouse model. Animal study.' },
      { label: '10 Hz flicker and attention, Frontiers in Psychology, 2024', url: 'https://doi.org/10.3389/fpsyg.2024.1376664', summary: 'The mixed picture: flicker changed brain signals but did not improve behavior on the task.' }
    ]
  },
  {
    slug: 'wind-down',
    title: 'Wind Down',
    tagline: 'Steps from 10 Hz down to 2 Hz to ease you toward sleep',
    art: { rgb: '255,120,80', big: '10 → 2 Hz', small: 'light + sound' },
    minutes: 30,
    light: true,
    glowRGB: '255,120,80',
    stages: [{ hz: 10, frac: 0.25 }, { hz: 6, frac: 0.25 }, { hz: 4, frac: 0.25 }, { hz: 2, frac: 0.25 }],
    audio: { mode: 'am', pulses: false },
    visualText: '10, 6, 4 then 2 Hz flicker, in four equal steps',
    soundText: '10, 6, 4 then 2 Hz pulsing music, in step with the light',
    tags: ['Sleep', 'Evening'],
    evidence: { level: 'early', label: 'Pilot studies' },
    overview: 'A warm red-amber glow and slow music that start at 10 Hz and step down through 6 and 4 to 2 Hz over your session, moving from “alpha” toward “delta”, the slow rhythm of deep sleep. Best in a dim room with your eyes closed.',
    why: 'Researchers have tested a 30-minute light-and-sound program that slides from about 10 Hz down to about 2 Hz in older adults with insomnia and arthritis pain. In a small analysis, delta-wave activity was higher after 30 minutes with the real program than with a placebo. Separately, in people with fibromyalgia, 10 Hz stimulation before bed was followed by less night-time pain and better sleep than a sham. Our version steps down in four stages instead of a smooth slide.',
    note: 'The pilot was small (30 people with arthritis pain and insomnia), and sleep scores improved in both the real and placebo groups with no significant difference between them. This has not been shown to treat insomnia.',
    studies: [
      { label: 'Tang et al., 2019: open-loop audiovisual stimulation and delta EEG', url: 'https://pubmed.ncbi.nlm.nih.gov/30862174/', summary: 'In 16 older adults, 30 minutes of the 10 to 2 Hz program raised delta-wave power versus placebo. Small analysis.' },
      { label: 'Audio-visual stimulation for sleep in older adults with osteoarthritis pain (pilot trial)', url: 'https://clinicaltrials.gov/study/NCT03441191', summary: '30-person pilot: sleep, pain and depression improved in both groups, with no significant difference between real and placebo.' },
      { label: 'Halpin et al., The Journal of Pain, 2025', url: 'https://eprints.whiterose.ac.uk/id/eprint/225359', summary: 'Fibromyalgia: 10 Hz stimulation before sleep was followed by less night-time pain and better sleep than sham. Small feasibility trial.' }
    ]
  },
  {
    slug: 'quiet-alpha',
    title: 'Quiet Alpha',
    tagline: 'A 10 Hz binaural beat. Headphones, no flashing light.',
    art: { rgb: '110,190,190', big: '10 Hz', small: 'binaural beat' },
    minutes: 30,
    light: false,
    glowRGB: '255,170,90',
    stages: [{ hz: 10, frac: 1 }],
    audio: { mode: 'binaural', pulses: false },
    visualText: 'No flicker: a steady, soft glow',
    soundText: '10 Hz binaural beat: your ears hear tones 10 Hz apart (headphones needed)',
    tags: ['Anxiety', 'Headphones'],
    evidence: { level: 'mixed', label: 'Small studies, mixed results' },
    overview: 'Calm music with a hidden 10 Hz binaural beat. Your left and right ears each hear a slightly different tone, and your brain perceives the 10 Hz difference as a gentle pulse. There is no flashing light, only a steady soft glow, so it works on any screen. Use stereo headphones.',
    why: 'Binaural beats have been studied for anxiety, pain and thinking tasks. A 2019 analysis of 22 studies found a moderate overall effect across those outcomes, depending on the beat frequency and how long people listened. In a trial before day surgery, patients who heard binaural beats had about 26% lower anxiety scores, compared with 11% for the same audio without the beats and 4% with no audio.',
    note: 'The overall effect pools different outcomes (anxiety, pain, memory and attention), study quality varies, and results are mixed. Not every study used 10 Hz. This is not a treatment for anxiety or pain.',
    studies: [
      { label: 'Garcia-Argibay et al., Psychological Research, 2019', url: 'https://pubmed.ncbi.nlm.nih.gov/30073406/', summary: 'Meta-analysis of 22 studies: a medium overall effect on cognition, anxiety and pain perception, varying by frequency and listening time.' },
      { label: 'Padmanabhan et al., Anaesthesia, 2005', url: 'https://pubmed.ncbi.nlm.nih.gov/16115248/', summary: 'Before day surgery, anxiety scores fell about 26% with binaural beats, 11% with the same audio without beats, 4% with no audio.' },
      { label: 'Kanzler et al., Exploration of Neuroprotective Therapy, 2023', url: 'https://explorationpub.com/Journals/ent/Article/100464', summary: '10 Hz binaural beats and isochronic tones for 21 days in healthy adults, followed by lower stress, anxiety and depression scores and better sleep.' }
    ]
  }
];
