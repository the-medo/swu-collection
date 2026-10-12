import {
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
  RegExpMatcher,
  type EnglishProfaneWord,
} from 'obscenity';

// Deliberately narrower than the English preset: mild language, anatomy and
// ambiguous words/names (e.g. Dick, ass, sex) are not automatic rejections.
// Review changes against the catalog and false-positive fixtures before adding words.
const blockedWords = new Set<EnglishProfaneWord>([
  'bitch',
  'blowjob',
  'cunt',
  'dildo',
  'fag',
  'handjob',
  'jizz',
  'kike',
  'nigger',
  'porn',
  'retard',
  'shit',
  'slut',
  'twat',
  'wank',
  'whore',
]);
const dataset = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf(phrase => !blockedWords.has(phrase.metadata?.originalWord as EnglishProfaneWord))
  // The preset also rejects standalone "Fu" and names starting with "Fuk".
  // Keep explicit spellings/evasions without those ambiguous abbreviations.
  .addPhrase(phrase =>
    phrase
      .setMetadata({ originalWord: 'fuck' })
      .addPattern(pattern`f[?]ck`)
      .addPattern(pattern`|fuk|`)
      .addWhitelistedTerm('fick'),
  )
  .addPhrase(phrase =>
    phrase.setMetadata({ originalWord: 'asshole' }).addPattern(pattern`asshole`),
  );
// These exemptions apply only to the matching substring, never to an entire
// submission. Keep ordinary surnames/words usable despite the preset's broad
// prefix patterns and optional letters.
const allowedTerms = [
  'fagan',
  'fagin',
  'fagerstrom',
  'shitara',
  'wankel',
  'twatt',
  'retardant',
  'hingga',
  'tinggal',
  'mangga',
  'slutspel',
];
dataset.addPhrase(phrase =>
  allowedTerms.reduce((builder, term) => builder.addWhitelistedTerm(term), phrase),
);
const matcher = new RegExpMatcher({ ...dataset.build(), ...englishRecommendedTransformers });

export function containsProfanity(text: string): boolean {
  // Normalize a detection copy only. Never rewrite the persisted/displayed text.
  const normalized = text
    .normalize('NFKD')
    .replace(/[\p{M}\p{Default_Ignorable_Code_Point}]/gu, '')
    .normalize('NFKC');
  if (matcher.hasMatch(normalized)) return true;
  // Obscenity's recommended transformers intentionally preserve separators.
  // Join only short fragments: whole hyphenated words such as "push-it"
  // must not turn into prohibited substrings. Tokenization keeps this linear
  // even for a maximum-size unbroken word.
  const compact = normalized
    .replace(/[\p{L}\p{N}\p{P}\p{S}]+/gu, word => {
      const fragments = word.split(/[\p{P}\p{S}]+/u).filter(Boolean);
      return fragments.length > 1 &&
        fragments.every(part => [...part].length >= 1 && [...part].length <= 2)
        ? fragments.join('')
        : word;
    })
    .replace(
      /(?<![\p{L}\p{N}])(?:[\p{L}\p{N}][\s\p{P}\p{S}]+){2,}[\p{L}\p{N}](?![\p{L}\p{N}])/gu,
      word => word.replace(/[\s\p{P}\p{S}]/gu, ''),
    );
  return compact !== normalized && matcher.hasMatch(compact);
}

export const profanityMessage = (label: string) =>
  `${label} contains language we don't allow. Please reword it.`;
