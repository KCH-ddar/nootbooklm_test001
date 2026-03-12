'use client';
import { useState } from 'react';

export default function Flashcard({ data, onClose }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  
  // O, X 개수 상태 관리
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [checkedCards, setCheckedCards] = useState({});

  const cards = data.cards || [];

  if (cards.length === 0) return <div className="p-10 bg-white rounded-3xl text-center">데이터가 없습니다.</div>;

  const handleScore = (type) => {
    if (checkedCards[idx]) return; 

    if (type === 'O') {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }
    
    setCheckedCards(prev => ({ ...prev, [idx]: type }));
  };

  const handleNext = () => {
    if (idx < cards.length - 1) {
      setIdx(idx + 1);
      setFlipped(false);
    } else {
      if (onClose) onClose();
    }
  };

  return (
    <div className="bg-white p-10 rounded-3xl flex flex-col items-center gap-6 shadow-xl max-w-md mx-auto relative border border-gray-100">
      
      {/* 상단 진행 상태 */}
      <div className="w-full flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">CARD {idx + 1} / {cards.length}</span>
        <h2 className="text-sm font-bold text-gray-800 tracking-tight">{data.title || "플래시카드 학습"}</h2>
      </div>
      
      {/* 카드 영역 */}
      <div 
        className="relative w-80 h-52 cursor-pointer [perspective:1000px]"
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] transition-transform ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
          {/* 앞면: 단어 */}
          <div className="absolute inset-0 w-full h-full bg-orange-50 border-2 border-orange-200 rounded-3xl flex items-center justify-center p-8 [backface-visibility:hidden] z-20 shadow-sm">
            <span className="text-2xl font-extrabold text-orange-900 text-center break-keep">{cards[idx].term}</span>
          </div>
          {/* 뒷면: 정의 */}
          <div className="absolute inset-0 w-full h-full bg-white border-2 border-orange-100 rounded-3xl flex items-center justify-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-inner">
            <p className="text-base text-gray-700 text-center font-medium leading-relaxed break-keep">{cards[idx].definition}</p>
          </div>
        </div>
      </div>

      {/* O, X 체크 버튼 (버튼 내부에 큰 숫자와 글자 배치) */}
      <div className="flex gap-4 w-full mt-4">
        {/* O 버튼 (초록색) */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleScore('O'); }}
          disabled={checkedCards[idx]}
          className={`flex-1 py-5 rounded-2xl transition-all flex flex-col items-center justify-center border-2 gap-1 ${
            checkedCards[idx] === 'O' 
              ? 'bg-green-600 border-green-600 text-white' 
              : 'bg-white border-green-500 text-green-600 hover:bg-green-50'
          } disabled:opacity-50 shadow-sm`}
        >
          <span className="text-1xl font-black leading-none">O: {score.correct}</span>
        </button>
        
        {/* X 버튼 (빨간색) */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleScore('X'); }}
          disabled={checkedCards[idx]}
          className={`flex-1 py-5 rounded-2xl transition-all flex flex-col items-center justify-center border-2 gap-1 ${
            checkedCards[idx] === 'X' 
              ? 'bg-red-500 border-red-500 text-white' 
              : 'bg-white border-red-400 text-red-500 hover:bg-red-50'
          } disabled:opacity-50 shadow-sm`}
        >
          <span className="text-1xl font-black leading-none">X: {score.wrong}</span>
        </button>
      </div>

      {/* 하단 컨트롤 바 */}
      <div className="flex items-center justify-between w-full mt-6 px-2">
        <button 
          disabled={idx === 0}
          onClick={(e) => { e.stopPropagation(); setIdx(idx - 1); setFlipped(false); }}
          className="text-sm font-bold text-gray-400 hover:text-gray-800 disabled:opacity-0 transition-colors"
        >◀ 이전</button>
        
        <button 
          onClick={handleNext}
          className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-lg"
        >
          {idx === cards.length - 1 ? "학습 완료" : "다음 카드"}
        </button>
      </div>
      <p className="text-[10px] text-gray-300 font-medium">카드를 클릭하면 정답이 보입니다.</p>
    </div>
  );
}