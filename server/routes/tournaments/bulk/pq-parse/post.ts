import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const zTournamentBulkPqParsePostRequest = z.object({
  data: z.string(),
});

const pqContinents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const;
const pqFormats = ['Premier', 'Sealed play', 'Eternal'] as const;

const zPqTournament = z.object({
  location: z.string().length(2),
  continent: z.enum(pqContinents),
  name: z.string().min(1),
  date: z.iso.date(),
  format: z.enum(pqFormats),
  link: z.string().url().nullable(),
});

const zPqParseResponse = z.object({
  tournaments: z.array(zPqTournament),
});

const pqResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'pq_tournament_list',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        tournaments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              continent: { type: 'string', enum: pqContinents },
              name: { type: 'string' },
              date: { type: 'string', format: 'date' },
              format: { type: 'string', enum: pqFormats },
              link: { type: ['string', 'null'] },
            },
            required: ['location', 'continent', 'name', 'date', 'format', 'link'],
            additionalProperties: false,
          },
        },
      },
      required: ['tournaments'],
      additionalProperties: false,
    },
  },
} as const;

export const tournamentBulkPqParsePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentBulkPqParsePostRequest),
  async c => {
    const { data } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournament: ['pq-parse'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          success: false,
          message: "You don't have permission to parse tournaments.",
        },
        403,
      );
    }

    const instructions = `
Extract every Planetary Qualifier (PQ) tournament from the supplied data. The input may be HTML, CSV, or copied website text. Never omit a data row.

Return exactly one JSON object with this shape: {"tournaments":[...]}. Do not return a single tournament object or a top-level array.

Every tournament must include all six properties:
- location: two-letter country code. Use US for USA.
- continent: one of Africa, Asia, Europe, North America, South America, or Oceania.
- name: use "PQ - City - State, US" for US events and "PQ - City, CountryCode" for all other events.
- date: ISO date in YYYY-MM-DD format.
- format: exactly one of "Premier", "Sealed play", or "Eternal". Normalize source values "Limited", "Sealed", and "Sealed Play" to "Sealed play".
- link: the source anchor URL when available; otherwise null.

Possible country codes:
AF,AL,DZ,AS,AD,AO,AI,AG,AR,AM,AW,AU,AT,AZ,BH,BD,BB,BY,BE,BZ,BJ,BM,BT,BO,BA,BW,BR,IO,VG,BN,BG,BF,MM,BI,KH,CM,CA,CV,KY,CF,ID,CL,CN,CO,KM,CK,CR,CI,HR,CU,CY,CZ,CD,DK,DJ,DM,DO,EC,EG,SV,
GQ,ER,EE,ET,FK,FO,FM,FJ,FI,FR,GF,PF,GA,GE,DE,GH,GI,GR,GL,GD,GP,GU,GT,GN,GW,GY,HT,HN,HK,HU,IS,IN,ID,IR,IQ,IE,IL,IT,JM,JP,JO,KZ,KE,KI,XK,KW,KG,LA,LV,LB,LS,LR,LY,LI,LT,LU,MO,MK,MG,MW,
MY,MV,ML,MT,MH,MQ,MR,MU,YT,MX,MD,MC,MN,ME,MS,MA,MZ,NA,NR,NP,NL,AN,NC,NZ,NI,NE,NG,NU,NF,KP,MP,NO,OM,PK,PW,PS,PA,PG,PY,PE,PH,PL,PT,PR,QA,CG,RE,RO,RU,RW,BL,SH,KN,MF,PM,VC,WS,SM,ST,SA,SN,RS,SC,SL,SG,SK,SI,SB,SO,ZA,KR,ES,LK,LC,SD,SR,SZ,SE,CH,SY,TW,TJ,TZ,TH,BS,GM,TL,TG,TK,TO,TT,TN,TR,TM,TC,TV,UG,UA,AE,GB,US,UY,VI,UZ,VU,VA,VE,VN,WF,YE,ZM,ZW
`;

    try {
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.5',
          messages: [
            {
              role: 'system',
              content: instructions,
            },
            {
              role: 'user',
              content: data,
            },
          ],
          response_format: pqResponseFormat,
          max_completion_tokens: 30000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        return c.json(
          {
            success: false,
            message: 'Error parsing PQ data.',
            error: errorData,
          },
          500,
        );
      }

      const result = await response.json();

      if (result.choices[0]?.finish_reason === 'length') {
        return c.json(
          {
            success: false,
            message: 'PQ data output was incomplete. Please try again.',
          },
          502,
        );
      }

      try {
        const content = result.choices[0]?.message?.content;
        if (!content) throw new Error('The model did not return any PQ data.');

        const parsedResponse = zPqParseResponse.parse(JSON.parse(content));
        const parsedData = parsedResponse.tournaments.map(({ link, ...tournament }) =>
          link ? { ...tournament, link } : tournament,
        );

        return c.json({
          success: true,
          message: 'PQ data parsed.',
          data: {
            parsedPqData: parsedData,
          },
        });
      } catch (error) {
        console.error('Invalid PQ data returned by OpenAI:', error);
        return c.json(
          {
            success: false,
            message: 'The AI returned invalid PQ data. Please try again.',
          },
          502,
        );
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return c.json(
        {
          success: false,
          message: 'Error parsing PQ data.',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);
