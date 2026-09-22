import type { Category, Participant } from '../types/gameTypes';

type Props = {
  participants: Participant[];
};

const upperCategories: { key: Category; label: string }[] = [
  { key: 'one', label: 'Ones' },
  { key: 'two', label: 'Twos' },
  { key: 'three', label: 'Threes' },
  { key: 'four', label: 'Fours' },
  { key: 'five', label: 'Fives' },
  { key: 'six', label: 'Sixes' },
];

const lowerCategories: { key: Category; label: string }[] = [
  { key: 'pair', label: 'Pair' },
  { key: 'twoPairs', label: 'Two pairs' },
  { key: 'threeOfKind', label: 'Three of a kind' },
  { key: 'fourOfKind', label: 'Four of a kind' },
  { key: 'full', label: 'Full house' },
  { key: 'smallStraight', label: 'Small straight' },
  { key: 'largeStraight', label: 'Large straight' },
  { key: 'general', label: 'General' },
  { key: 'chance', label: 'Chance' },
];

function getUpperTotal(participant: Participant) {
  return upperCategories.reduce(
    (total, { key }) => total + (participant.scoreCard[key] ?? 0),
    0,
  );
}

function getLowerTotal(participant: Participant) {
  return lowerCategories.reduce(
    (total, { key }) => total + (participant.scoreCard[key] ?? 0),
    0,
  );
}

function getBonus(participant: Participant) {
  return getUpperTotal(participant) >= 63 ? 35 : 0;
}

function getTotal(participant: Participant) {
  return getUpperTotal(participant) +
    getBonus(participant) +
    getLowerTotal(participant);
}

function ScoreRow({
  label,
  category,
  participants,
}: {
  label: string;
  category: Category;
  participants: Participant[];
}) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="truncate px-4 py-1.5 text-xs text-gray-500">
        {label}
      </td>

      {participants.map((participant) => (
        <td
          key={participant.id}
          className="px-3 py-1.5 text-center text-sm font-medium text-gray-700"
        >
          {participant.scoreCard[category] ?? '—'}
        </td>
      ))}
    </tr>
  );
}

function SectionHeader({
  label,
  participants,
}: {
  label: string;
  participants: Participant[];
}) {
  return (
    <tr className="border-y border-gray-100 bg-gray-50">
      <td
        className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400"
        colSpan={participants.length + 1}
      >
        {label}
      </td>
    </tr>
  );
}

export default function GameScoreBoard({ participants }: Props) {
  return (
    <div className="w-fit max-w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white mx-auto">
      <table className="table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-36" />

          {participants.map((participant) => (
            <col key={participant.id} className="w-24" />
          ))}
        </colgroup>

        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-800">
              Score
            </th>

            {participants.map((participant) => (
              <th
                key={participant.id}
                className="px-3 py-2.5 text-center text-xs font-semibold text-gray-800"
              >
                {participant.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* UPPER */}
          <SectionHeader
            label="Upper section"
            participants={participants}
          />

          {upperCategories.map(({ key, label }) => (
            <ScoreRow
              key={key}
              category={key}
              label={label}
              participants={participants}
            />
          ))}

          {/* UPPER TOTAL */}
          <tr className="border-t border-gray-200">
            <td className="px-4 py-1.5 text-xs font-semibold text-gray-600">
              Upper total
            </td>

            {participants.map((participant) => (
              <td
                key={participant.id}
                className="px-3 py-1.5 text-center text-xs font-semibold text-gray-700"
              >
                {getUpperTotal(participant)}
              </td>
            ))}
          </tr>

          {/* BONUS */}
          <tr className="border-b border-gray-200">
            <td className="px-4 py-1.5 text-xs font-medium text-gray-500">
              Bonus
            </td>

            {participants.map((participant) => {
              const bonus = getBonus(participant);

              return (
                <td
                  key={participant.id}
                  className={`px-3 py-1.5 text-center text-xs font-semibold ${
                    bonus > 0
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                  }`}
                >
                  {bonus > 0 ? `+${bonus}` : '—'}
                </td>
              );
            })}
          </tr>

          {/* LOWER */}
          <SectionHeader
            label="Lower section"
            participants={participants}
          />

          {lowerCategories.map(({ key, label }) => (
            <ScoreRow
              key={key}
              category={key}
              label={label}
              participants={participants}
            />
          ))}
        </tbody>

        {/* TOTAL */}
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td className="px-4 py-2 text-xs font-bold text-gray-800">
              Total
            </td>

            {participants.map((participant) => (
              <td
                key={participant.id}
                className="px-3 py-2 text-center text-sm font-bold text-gray-900"
              >
                {getTotal(participant)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}