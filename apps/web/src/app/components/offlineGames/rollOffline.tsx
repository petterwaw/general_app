'use client';

import { useState } from 'react';
import RolledNumber from './rolledNumber';
import ChooseNumber from './chooseNumber';
import type { DiceRoll, DieFace } from '@dice-app/contracts';
import type { LocalRoll } from '../../types/gameTypes';
import { submitRoll } from '../../api/games';

type Props = {
  gameId: string;
  playerId: string;
  currentDice: DiceRoll | null;
};

export default function RollOffline({ gameId, playerId, currentDice }: Props) {
  const [roll, setRoll] = useState<LocalRoll>([null, null, null, null, null]);

  const [activeIndex, setActiveIndex] = useState(0);

  function choose(num: DieFace) {
    setRoll((currentRoll) => {
      const newRoll = [...currentRoll] as LocalRoll;
      if (activeIndex !== 5) {
        newRoll[activeIndex] = num;
      }
      return newRoll;
    });

    setActiveIndex((current) => {
      if (current === 5) {
        return 5;
      }

      return current + 1;
    });
  }

  function changeActive(index: number) {
    setActiveIndex(index);
  }

  async function submitDice() {
    if (roll.includes(null)) {
      return;
    }

    const dice = roll as DiceRoll;

    try {
      const result = await submitRoll(gameId, playerId, dice);
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
  const dieFaces: DieFace[] = [1, 2, 3, 4, 5, 6];

  return (
    <div className="flex flex-col mx-auto my-10">
      <div className="flex gap-3 mx-auto">
        {roll.map((dice, index) => (
          <RolledNumber
            key={index}
            setActive={() => changeActive(index)}
            isActive={activeIndex === index}
          >
            {dice}
          </RolledNumber>
        ))}
      </div>
      <div className="flex gap-3 py-4 mx-auto">
        {dieFaces.map((num, index) => (
          <ChooseNumber
            key={index}
            onChoose={() => choose(num)}
            activeIndex={activeIndex}
            number={num}
          ></ChooseNumber>
        ))}
      </div>
      <button
        className={`flex mx-auto py-2 px-6 items-center rounded-xl
        border-2 text-l font-bold 
        text-gray-800  transition hover:border-purple-500 hover:bg-purple-50 hover:shadow-md
        disabled:cursor-not-allowed disabled:opacity-50 
        ${activeIndex === 5 ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white '}`}
        disabled={roll.includes(null)}
        onClick={submitDice}
      >
        Submit dice
      </button>
    </div>
  );
}
