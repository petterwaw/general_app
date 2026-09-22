type Props = {
  children: number | null;
  isActive: boolean;
  setActive: () => void;
};

export default function RolledNumber({children, setActive, isActive}: Props ) {
    
    return <button className={`flex h-16 w-16 items-center justify-center rounded-xl 
        border-2 text-2xl font-bold 
        text-gray-800  transition hover:border-purple-500 hover:bg-purple-50 hover:shadow-md ${isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white'}`}
        onClick={setActive}
        >
        <p>{children ?? '-'}</p>
    </button>
}