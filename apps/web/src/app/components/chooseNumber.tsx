type Props = {
  number: number;
  onChoose: () => void;
};

export default function ChooseNumber({number, onChoose}: Props) {
    return <button
        className='flex h-16 w-16 items-center justify-center rounded-xl 
        border-2 border-gray-300 bg-white text-2xl font-bold 
        text-gray-800 shadow-sm transition hover:border-purple-500 hover:bg-purple-50 hover:shadow-md' 
        onClick={onChoose}>
        <p>{number}</p>
    </button>
}