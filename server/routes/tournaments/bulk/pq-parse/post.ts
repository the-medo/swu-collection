import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const zTournamentBulkPqParsePostRequest = z.object({
  data: z.string(),
});

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

    /** THIS WILL BE INSTRUCTION TO LLM:
     * I will provide you unparsed data that can be in different forms - copy pasted from web, in form of HTML elements, csv, etc.
     * Please parse the data and for every entry you find, return me JSON array of these following 4 properties (5, if links are available):
     *
     * location - should be always only in form of country code from list of available country codes below (in case of USA, country code should be US)
     * continent - should be always only in form of continent from list of available continents below.
     * name - should be always in one of these two forms:
     *    - `PQ - ${city} - ${state}, ${countryCode}` - best in case of US
     *    - `PQ - ${city}, ${countryCode}` - preferred one (in case of NOT US)
     * date - should be ISO string
     * link - only if available, otherwise undefined
     *
     * Possible continents:
     * 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'
     *
     * Possible country codes:
     * AF,AL,DZ,AS,AD,AO,AI,AG,AR,AM,AW,AU,AT,AZ,BH,BD,BB,BY,BE,BZ,BJ,BM,BT,BO,BA,BW,BR,IO,VG,BN,BG,BF,MM,BI,KH,CM,CA,CV,KY,CF,ID,CL,CN,CO,KM,CK,CR,CI,HR,CU,CY,CZ,CD,DK,DJ,DM,DO,EC,EG,SV,
     * GQ,ER,EE,ET,FK,FO,FM,FJ,FI,FR,GF,PF,GA,GE,DE,GH,GI,GR,GL,GD,GP,GU,GT,GN,GW,GY,HT,HN,HK,HU,IS,IN,ID,IR,IQ,IE,IL,IT,JM,JP,JO,KZ,KE,KI,XK,KW,KG,LA,LV,LB,LS,LR,LY,LI,LT,LU,MO,MK,MG,MW,
     * MY,MV,ML,MT,MH,MQ,MR,MU,YT,MX,MD,MC,MN,ME,MS,MA,MZ,NA,NR,NP,NL,AN,NC,NZ,NI,NE,NG,NU,NF,KP,MP,NO,OM,PK,PW,PS,PA,PG,PY,PE,PH,PL,PT,PR,QA,CG,RE,RO,RU,RW,BL,SH,KN,MF,PM,VC,WS,SM,ST,SA,SN,RS,SC,SL,SG,SK,SI,SB,SO,ZA,KR,ES,LK,LC,SD,SR,SZ,SE,CH,SY,TW,TJ,TZ,TH,BS,GM,TL,TG,TK,TO,TT,TN,TR,TM,TC,TV,UG,UA,AE,GB,US,UY,VI,UZ,VU,VA,VE,VN,WF,YE,ZM,ZW
     *
     * Example 1 - copypasted content in completely random structure:
     * Input:
     * ```
     * Date	Store	City	State
     * Saturday, May 3, 2025	Crazy Squirrel Game Store 	Fresno	California
     * Sunday, May 11, 2025	Octopus Game	BOURGES	France
     * ```
     * Output:
     * [{"location": "US", "continent": "North America", "name": "PQ - Fresno - California, US", "date": "2025-05-03"}, {"location": "FR", "continent": "Europe", "name": "PQ - Bourges, FR", "date": "2025-05-11"}]
     *
     * Example 2 - XML data:
     * Input (only partial, html table rows as example):
     * ```
     * <tr height="19" style="height: 14.5pt;"><td style="display: table-cell; width: 200px;">Saturday, May 3, 2025</td><td style="display: table-cell; width: 200px;"><a href="https://starwarsunlimited.com/search?searchTerm=crazy&amp;myLocation=false&amp;store=811">Crazy Squirrel Game Store&nbsp;</a></td><td style="display: table-cell; width: 200px;">Fresno</td><td style="display: table-cell; width: 200px;">California</td></tr>
     * <tr height="19" style="height: 14.5pt;"><td style="display: table-cell; width: 200px;">Sunday, May 11, 2025</td><td style="display: table-cell; width: 200px;"><a href="https://starwarsunlimited.com/search?myLocation=false&amp;searchTerm=octopus&amp;store=3394">Octopus Game</a></td><td style="display: table-cell; width: 200px;">BOURGES</td><td style="display: table-cell; width: 200px;">France</td></tr>
     * ```
     * Output:
     * [{"location": "US", "continent": "North America", "name": "PQ - Fresno - California, US", "date": "2025-05-03", link: "https://starwarsunlimited.com/search?searchTerm=crazy&amp;myLocation=false&amp;store=811"}, {"location": "FR", "continent": "Europe", "name": "PQ - Bourges, FR", "date": "2025-05-11", link: "https://starwarsunlimited.com/search?myLocation=false&amp;searchTerm=octopus&amp;store=3394"}]
     *
     *
     */

    // Extract the instructions from the comment
    const instructions = `
I will provide you unparsed data that can be in different forms - copy pasted from web, in form of HTML elements, csv, etc.
Please parse the data and for every entry you find, return me JSON array of these following 4 properties (5, if links are available):

location - should be always only in form of country code from list of available country codes below (in case of USA, country code should be US)
continent - should be always only in form of continent from list of available continents below.
name - should be always in one of these two forms:
   - \`PQ - \${city} - \${state}, \${countryCode}\` - best in case of US
   - \`PQ - \${city}, \${countryCode}\` - preferred one (in case of NOT US)
date - should be ISO string
link - only if available, otherwise undefined

Possible continents:
'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'

Possible country codes:
AF,AL,DZ,AS,AD,AO,AI,AG,AR,AM,AW,AU,AT,AZ,BH,BD,BB,BY,BE,BZ,BJ,BM,BT,BO,BA,BW,BR,IO,VG,BN,BG,BF,MM,BI,KH,CM,CA,CV,KY,CF,ID,CL,CN,CO,KM,CK,CR,CI,HR,CU,CY,CZ,CD,DK,DJ,DM,DO,EC,EG,SV,
GQ,ER,EE,ET,FK,FO,FM,FJ,FI,FR,GF,PF,GA,GE,DE,GH,GI,GR,GL,GD,GP,GU,GT,GN,GW,GY,HT,HN,HK,HU,IS,IN,ID,IR,IQ,IE,IL,IT,JM,JP,JO,KZ,KE,KI,XK,KW,KG,LA,LV,LB,LS,LR,LY,LI,LT,LU,MO,MK,MG,MW,
MY,MV,ML,MT,MH,MQ,MR,MU,YT,MX,MD,MC,MN,ME,MS,MA,MZ,NA,NR,NP,NL,AN,NC,NZ,NI,NE,NG,NU,NF,KP,MP,NO,OM,PK,PW,PS,PA,PG,PY,PE,PH,PL,PT,PR,QA,CG,RE,RO,RU,RW,BL,SH,KN,MF,PM,VC,WS,SM,ST,SA,SN,RS,SC,SL,SG,SK,SI,SB,SO,ZA,KR,ES,LK,LC,SD,SR,SZ,SE,CH,SY,TW,TJ,TZ,TH,BS,GM,TL,TG,TK,TO,TT,TN,TR,TM,TC,TV,UG,UA,AE,GB,US,UY,VI,UZ,VU,VA,VE,VN,WF,YE,ZM,ZW

Example 1 - copypasted content in completely random structure:
Input:
\`\`\`
Date	Store	City	State
Saturday, May 3, 2025	Crazy Squirrel Game Store 	Fresno	California
Sunday, May 11, 2025	Octopus Game	BOURGES	France
\`\`\`
Output:
[{"location": "US", "continent": "North America", "name": "PQ - Fresno - California, US", "date": "2025-05-03"}, {"location": "FR", "continent": "Europe", "name": "PQ - Bourges, FR", "date": "2025-05-11"}]

Example 2 - XML data:
Input (only partial, html table rows as example):
\`\`\`
<tr height="19" style="height: 14.5pt;"><td style="display: table-cell; width: 200px;">Saturday, May 3, 2025</td><td style="display: table-cell; width: 200px;"><a href="https://starwarsunlimited.com/search?searchTerm=crazy&amp;myLocation=false&amp;store=811">Crazy Squirrel Game Store&nbsp;</a></td><td style="display: table-cell; width: 200px;">Fresno</td><td style="display: table-cell; width: 200px;">California</td></tr>
<tr height="19" style="height: 14.5pt;"><td style="display: table-cell; width: 200px;">Sunday, May 11, 2025</td><td style="display: table-cell; width: 200px;"><a href="https://starwarsunlimited.com/search?myLocation=false&amp;searchTerm=octopus&amp;store=3394">Octopus Game</a></td><td style="display: table-cell; width: 200px;">BOURGES</td><td style="display: table-cell; width: 200px;">France</td></tr>
\`\`\`
Output:
[{"location": "US", "continent": "North America", "name": "PQ - Fresno - California, US", "date": "2025-05-03", "link": "https://starwarsunlimited.com/search?searchTerm=crazy&amp;myLocation=false&amp;store=811"}, {"location": "FR", "continent": "Europe", "name": "PQ - Bourges, FR", "date": "2025-05-11", "link": "https://starwarsunlimited.com/search?myLocation=false&amp;searchTerm=octopus&amp;store=3394"}]
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
          model: 'gpt-4.1-mini-2025-04-14',
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
          response_format: { type: 'json_object' },
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

      let parsedData;
      try {
        // If it's a string, parse it
        parsedData = JSON.parse(result.choices[0].message.content);
      } catch (e) {
        // If parsing fails, it might already be an object
        parsedData = result.choices[0].message.content;
      }

      return c.json({
        success: true,
        message: 'PQ data parsed.',
        data: {
          parsedPqData: parsedData,
        },
      });
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
