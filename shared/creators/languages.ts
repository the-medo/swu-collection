// ISO 639-1 languages for authoring. Discovery uses only languages returned by its facet.
const languageCodes =
  'aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu';
export const creatorLanguages = languageCodes.split(' ');
const names = new Intl.DisplayNames(['en'], { type: 'language' });

export function languageInfo(code: string) {
  try {
    const locale = new Intl.Locale(code);
    // Flags are visual language cues; preserve an explicitly selected regional variant.
    const region = locale.region ?? (locale.language === 'en' ? 'GB' : locale.maximize().region);
    return {
      code: locale.toString(),
      label: names.of(locale.toString()) ?? code,
      flag:
        region && /^[A-Z]{2}$/.test(region)
          ? [...region].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('')
          : '🌐',
    };
  } catch {
    return { code, label: code, flag: '🌐' };
  }
}
