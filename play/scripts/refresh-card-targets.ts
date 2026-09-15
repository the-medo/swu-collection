import postgres from 'postgres';
import { z } from 'zod';

const asOf = z.iso.date().parse(process.argv[2]);
const url = new URL(process.env.CROSSFIRE_TEST_DATABASE_URL ?? '');
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
  !url.pathname.startsWith('/swubase_')
)
  throw new Error('Card target extraction requires an explicit local worktree database');
const sql = postgres(url.href, { max: 1 });
try {
  const report = await sql.begin('isolation level repeatable read read only', async tx => {
    const [dates] =
      await tx`select (${asOf}::date - 89)::text as ranking_start, (${asOf}::date - 14)::text as winners_start`;
    const sample =
      await tx`select distinct d.id from tournament_deck td join tournament t on t.id=td.tournament_id
      join deck d on d.id=td.deck_id where t.imported and d.public=1
      and t.date >= ${dates!.ranking_start}::date and t.date <= ${asOf}::date`;
    const ranking = await tx`with sample as (
      select distinct d.id,d.leader_card_id_1,d.leader_card_id_2,d.base_card_id
      from tournament_deck td join tournament t on t.id=td.tournament_id join deck d on d.id=td.deck_id
      where t.imported and d.public=1 and t.date >= ${dates!.ranking_start}::date and t.date <= ${asOf}::date
    ), cards as (
      select s.id,dc.card_id,dc.quantity from sample s join deck_card dc on dc.deck_id=s.id where dc.board=1 and dc.quantity>0
      union all select id,leader_card_id_1,1 from sample where leader_card_id_1 is not null
      union all select id,leader_card_id_2,1 from sample where leader_card_id_2 is not null
      union all select id,base_card_id,1 from sample where base_card_id is not null
    ) select card_id as "cardId",count(distinct id)::int as decks,sum(quantity)::int as copies
      from cards group by card_id order by decks desc,card_id limit 200`;
    const tournaments = await tx`select t.id,t.name,t.date::text,t.format,t.imported,t.attendance,
      (select count(*)::int from tournament_deck td join deck d on d.id=td.deck_id
        where td.tournament_id=t.id and td.placement between 1 and 8 and d.public=1) as "top8Decks",
      (select count(*)::int from tournament_deck td where td.tournament_id=t.id and td.placement=1) as winners
      from tournament t where t.date >= ${dates!.winners_start}::date and t.date <= ${asOf}::date order by t.date,t.id`;
    const top8 =
      await tx`select t.id as "tournamentId",t.name,t.date::text,t.format,td.placement,td.deck_id as "deckId",
      d.leader_card_id_1 as leader,d.leader_card_id_2 as "secondLeader",d.base_card_id as base,
      coalesce((select json_agg(json_build_object('cardId',dc.card_id,'quantity',dc.quantity,'board',dc.board) order by dc.board,dc.card_id)
        from deck_card dc where dc.deck_id=d.id and dc.quantity>0 and dc.board in(1,2)), '[]'::json) as cards
      from tournament t join tournament_deck td on td.tournament_id=t.id and td.placement between 1 and 8 join deck d on d.id=td.deck_id
      where t.imported and d.public=1 and t.date >= ${dates!.winners_start}::date and t.date <= ${asOf}::date order by t.date,t.id,td.placement,td.deck_id`;
    return {
      asOf,
      rankingStart: dates!.ranking_start,
      winnersStart: dates!.winners_start,
      sampleDecks: sample.length,
      ranking: ranking.map((row, i) => ({ rank: i + 1, ...row })),
      tournaments: [...tournaments],
      winners: top8.filter(row => row.placement === 1).map(({ placement, ...row }) => row),
      top8: [...top8],
    };
  });
  await Bun.write(
    new URL('../testing/fixtures/meta-targets.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      asOf,
      sampleDecks: report.sampleDecks,
      ranked: report.ranking.length,
      winners: report.winners.length,
      top8: report.top8.length,
    }),
  );
} finally {
  await sql.end();
}
