import type {
  Category,
  ParticipantView,
} from '@dice-app/contracts';

import { ScoreCell } from './scoreCell';

type Props = {
  participants: ParticipantView[];
  currentPlayerId: string | null;
  selectedCategory: Category | null;
  predictedScores?: Partial<Record<Category, number>>;
  onCategorySelect: (category: Category) => void;
  onCategorySubmit: (category: Category) => void;
};

const upperCategories: {
  key: Category;
  label: string;
}[] = [
  { key: 'one', label: 'Jedynki' },
  { key: 'two', label: 'Dwójki' },
  { key: 'three', label: 'Trójki' },
  { key: 'four', label: 'Czwórki' },
  { key: 'five', label: 'Piątki' },
  { key: 'six', label: 'Szóstki' },
];

const lowerCategories: {
  key: Category;
  label: string;
}[] = [
  { key: 'pair', label: 'Para' },
  { key: 'twoPairs', label: 'Dwie pary' },
  { key: 'threeOfKind', label: 'Trójka' },
  { key: 'fourOfKind', label: 'Kareta' },
  { key: 'full', label: 'Full' },
  { key: 'smallStraight', label: 'Mały strit' },
  { key: 'largeStraight', label: 'Duży strit' },
  { key: 'chance', label: 'Szansa' },
  { key: 'general', label: 'Generał' },
];

function getUpperTotal(participant: ParticipantView) {
  return upperCategories.reduce(
    (total, { key }) =>
      total + (participant.scoreCard[key] ?? 0),
    0,
  );
}

function getLowerTotal(participant: ParticipantView) {
  return lowerCategories.reduce(
    (total, { key }) =>
      total + (participant.scoreCard[key] ?? 0),
    0,
  );
}

function getBonus(participant: ParticipantView) {
  return getUpperTotal(participant) >= 63 ? 35 : 0;
}

function getTotal(participant: ParticipantView) {
  return (
    getUpperTotal(participant) +
    getBonus(participant) +
    getLowerTotal(participant)
  );
}

function SectionHeader({
  label,
  participantCount,
}: {
  label: string;
  participantCount: number;
}) {
  return (
    <tr>
      <td
        colSpan={participantCount + 1}
        className="border-y border-neutral-200 bg-neutral-50 px-4 py-2"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </span>
      </td>
    </tr>
  );
}

export default function GameScoreBoard({
  participants,
  currentPlayerId,
  selectedCategory,
  predictedScores = {},
  onCategorySelect,
  onCategorySubmit,
}: Props) {
  
  return (
    <div className="mx-auto w-fit max-w-full overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="border-collapse text-sm">
        <colgroup>
          <col className="w-40" />

          {participants.map((participant) => (
            <col
              key={participant.id}
              className="w-28"
            />
          ))}
        </colgroup>

        <thead>
          <tr className="border-b border-neutral-200">
            <th className="px-4 py-4 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Kategoria
              </span>
            </th>

            {participants.map((participant) => {
              const isCurrentPlayer =
                participant.id === currentPlayerId;

              return (
                <th
                  key={participant.id}
                  className={[
                    'border-l border-neutral-200 px-3 py-3 text-center',
                    isCurrentPlayer ? 'bg-neutral-50' : '',
                  ].join(' ')}
                >
                  <span className="text-sm font-semibold text-neutral-700">
                    {participant.name}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          <SectionHeader
            label="Górna sekcja"
            participantCount={participants.length}
          />

          {upperCategories.map(({ key, label }) => (
            <tr
              key={key}
              className="border-b border-neutral-100"
            >
              <td className="px-4 py-2 text-xs text-neutral-600">
                {label}
              </td>

              {participants.map((participant) => (
                <ScoreCell
                  key={participant.id}
                  category={key}
                  value={participant.scoreCard[key]}
                  predictedScore={
                    participant.id === currentPlayerId
                      ? predictedScores[key]
                      : undefined
                  }
                  isCurrentPlayer={
                    participant.id === currentPlayerId
                  }
                  isSelected={selectedCategory === key}
                  onSelect={onCategorySelect}
                  onSubmit={onCategorySubmit}
                />
              ))}
            </tr>
          ))}

          <tr className="border-t border-neutral-200">
            <td className="px-4 py-2 text-xs font-semibold text-neutral-600">
              Bonus
            </td>

            {participants.map((participant) => {
              const bonus = getBonus(participant);

              return (
                <td
                  key={participant.id}
                  className={[
                    'border-l border-neutral-200 px-3 py-2 text-center text-xs font-semibold',
                    participant.id === currentPlayerId
                      ? 'bg-neutral-50'
                      : '',
                  ].join(' ')}
                >
                  <span
                    className={
                      bonus > 0
                        ? 'text-emerald-600'
                        : 'text-neutral-300'
                    }
                  >
                    {bonus > 0 ? `+${bonus}` : '—'}
                  </span>
                </td>
              );
            })}
          </tr>

          <SectionHeader
            label="Dolna sekcja"
            participantCount={participants.length}
          />

          {lowerCategories.map(({ key, label }) => (
            <tr
              key={key}
              className="border-b border-neutral-100"
            >
              <td className="px-4 py-2 text-xs text-neutral-600">
                {label}
              </td>

              {participants.map((participant) => (
                <ScoreCell
                  key={participant.id}
                  category={key}
                  value={participant.scoreCard[key]}
                  predictedScore={
                    participant.id === currentPlayerId
                      ? predictedScores[key]
                      : undefined
                  }
                  isCurrentPlayer={
                    participant.id === currentPlayerId
                  }
                  isSelected={selectedCategory === key}
                  onSelect={onCategorySelect}
                  onSubmit={onCategorySubmit}
                />
              ))}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="border-t-2 border-neutral-200 bg-neutral-50">
            <td className="rounded-bl-2xl px-4 py-3 text-xs font-bold text-neutral-800">
              Suma
            </td>

            {participants.map((participant, index) => (
              <td
                key={participant.id}
                className={[
                  'border-l border-neutral-200 px-3 py-3 text-center text-sm font-bold text-neutral-900',
                  index === participants.length - 1
                    ? 'rounded-br-2xl'
                    : '',
                  participant.id === currentPlayerId
                    ? 'bg-neutral-50'
                    : '',
                ].join(' ')}
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