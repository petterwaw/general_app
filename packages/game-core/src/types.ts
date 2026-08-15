export type Category = 'one' | 'two' | 'three' | 'four' | 'five' | 'six' | 'pair' | 'twoPairs' |
                'threeOfKind' | 'fourOfKind' | 'full' | 'smallStraight' | 'largeStraight' |
                'general' | 'chance'
export type DiceRoll = [number, number, number, number, number]

type ScoreCardElement = number | null

export type ScoreCard = Record<Category, ScoreCardElement>