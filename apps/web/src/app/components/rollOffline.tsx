'use client';

import { useState, useEffect } from 'react';
import RolledNumber from './rolledNumber';
import ChooseNumber from './chooseNumber';

export default function RollOffline({ gameId }: { gameId: string }) {
  const [roll, setRoll] = useState<(number | null)[]>([
  null,
  null,
  null,
  null,
  null,
]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`http://localhost:3000/games/${gameId}`);
        const data = await res.json();

        if (!data) throw new Error('Could not find game data');

        if (data.data.currentDice) {
          setRoll(data.data.currentDice);
        }
      } catch (err) {
        console.log(err);
      }
    }

    fetchGame();
  }, [gameId]);

  function choose(num: number) {
    setRoll((currentRoll) => {
      const newRoll = [...currentRoll];
      newRoll[activeIndex] = num;
      return newRoll;
    });

    setActiveIndex((curr) => {
        if(curr===4) return 0
        return curr + 1
    });
  }

  function changeActive(index: number) {
    setActiveIndex(index)
  }

  return (
    <>
      <div className='flex gap-3'>
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
            onChoose={() => choose(num)}
            number={num}
            >
          </ChooseNumber>
        ))}
      </div>
    </>
  );
}
