type Props = {
  number: number;
  activeIndex: number
  onChoose: () => void;
};

export default function ChooseNumber({number, onChoose, activeIndex}: Props) {
    return <button
        disabled={activeIndex === 5}
        className={`flex h-10 w-10 items-center justify-center rounded-xl 
        border-2 border-gray-300 bg-white text-2xl font-bold 
        text-gray-800 transition 
        hover:border-purple-500 hover:bg-purple-50 hover:shadow-md
        disabled:cursor-not-allowed disabled:opacity-50`}
        onClick={onChoose}>
        <p>{number}</p>
    </button>
}