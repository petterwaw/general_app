export type Category = 'one' | 'two' | 'three' | 'four' | 'five' | 'six' | 'pair' | 'twoPairs' |
                'threeOfKind' | 'fourOfKind' | 'full' | 'smallStraight' | 'largeStraight' |
                'general' | 'chance'
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6
export type DiceRoll = [DieFace, DieFace, DieFace, DieFace, DieFace]

type ScoreCardElement = number | null

export type ScoreCard = Record<Category, ScoreCardElement>