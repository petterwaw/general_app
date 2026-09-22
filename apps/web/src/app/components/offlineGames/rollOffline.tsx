'use client';

import { useState, useEffect } from 'react';
import RolledNumber from './rolledNumber';
import ChooseNumber from './chooseNumber';
import type { DiceRoll, LocalRoll, DieFace } from '../../types/gameTypes'

export default function RollOffline({ currentDice }: { currentDice: DiceRoll | null }) {
  const [roll, setRoll] = useState<LocalRoll>([
  null,
  null,
  null,
  null,
  null,
]);

  const [activeIndex, setActiveIndex] = useState(0);

  function choose(num: DieFace) {
    setRoll((currentRoll) => {
      const newRoll = [...currentRoll] as LocalRoll;
      if(activeIndex!==5) newRoll[activeIndex] = num;
      return newRoll;
    });

    setActiveIndex((curr) => {
        if(curr===5) return 0
        return curr + 1
    });
  }

  function changeActive(index: number) {
    setActiveIndex(index)
  }

  return (
    <div 
    className='flex flex-col mx-auto my-10'
    >
      <div className='flex gap-3 mx-auto'>
        {roll.map((dice, index) => (
          <RolledNumber 
            key={index}
            setActive={() => changeActive(index)}
            isActive={activeIndex === index}
            >{dice}</RolledNumber>
        ))}
      </div>
      <div className='flex gap-3 py-4'>
        {[1, 2, 3, 4, 5, 6].map((num, index) => (
          <ChooseNumber 
            key={index} 
            onChoose={() => choose(num as DieFace)}
            activeIndex={activeIndex}
            number={num}
            >
          </ChooseNumber>
        ))}
      </div>
      <button
        className={`flex mx-auto py-4 px-10 items-center rounded-xl
        border-2 text-2xl font-bold 
        text-gray-800  transition hover:border-purple-500 hover:bg-purple-50 hover:shadow-md
        disabled:cursor-not-allowed disabled:opacity-50 
        ${activeIndex===5 ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white '}`}
        disabled={roll.includes(null)}
      >
        Submit dice
      </button>
    </div>
  );
}
