'use client';
import { useState } from 'react';

export default function QuizCard({ data, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  // 정답 및 오답 개수 상태
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  const questions = data.questions || [];
  const currentQ = questions[currentIdx];

  if (questions.length === 0) return <div className="p-10">퀴즈 데이터가 없습니다.</div>;

  const handleCheckAnswer = () => {
    setShowResult(true);
    if (selected === currentQ.answerIndex) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
      setShowResult(false);
    }else {
      if (onClose) onClose();
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl text-left max-w-xl mx-auto border border-gray-100 relative">
      {/* 상단 헤더: 제목 및 점수 현황 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 leading-tight">{data.title}</h2>
          <span className="text-xs font-mono text-blue-400 mt-1 block">Q. {currentIdx + 1} / {questions.length}</span>
        </div>
        
        {/* 점수판 (O: -개, X: -개) */}
        <div className="flex gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-600 font-bold text-sm text-[11px]">O:</span>
            <span className="text-blue-600 font-mono font-bold text-sm">{score.correct}</span>
          </div>
          <div className="w-[1px] h-3 bg-gray-200 self-center" />
          <div className="flex items-center gap-1.5">
            <span className="text-red-500 font-bold text-sm text-[11px]">X:</span>
            <span className="text-red-500 font-mono font-bold text-sm">{score.wrong}</span>
          </div>
        </div>
      </div>

      <p className="text-lg mb-8 font-semibold text-gray-700 leading-snug">
        {currentQ.question}
      </p>

      <div className="space-y-3">
        {currentQ.options.map((opt, idx) => {
          // 상태에 따른 스타일 결정
          const isCorrectIdx = idx === currentQ.answerIndex;
          const isSelectedIdx = idx === selected;
          
          let buttonClass = "border-gray-50 bg-gray-50"; // 기본
          if (showResult) {
            if (isCorrectIdx) {
              buttonClass = "bg-green-50 border-green-500 text-green-700"; // 무조건 정답지는 초록색
            } else if (isSelectedIdx && !isCorrectIdx) {
              buttonClass = "bg-red-50 border-red-400 text-red-700"; // 틀린 걸 골랐을 때만 빨간색
            }
          } else if (isSelectedIdx) {
            buttonClass = "border-blue-500 bg-blue-50 text-blue-700"; // 결과 확인 전 선택 상태
          }

          return (
            <div key={idx} className="flex flex-col gap-2">
              <button
                onClick={() => !showResult && setSelected(idx)}
                className={`w-full p-4 text-left rounded-2xl border-2 transition-all duration-200 ${buttonClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold text-xs opacity-50`}>
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-sm font-medium">{opt}</span>
                </div>
              </button>
              
              {/* 정답인 항목 아래에만 해설 노출 (정답/오답 상관없이 정답 위치 아래 표시) */}
              {showResult && isCorrectIdx && (
                <div className="px-4 py-3 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-1 duration-300">
                  <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    💡 {currentQ.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        {!showResult ? (
          <button 
            onClick={handleCheckAnswer}
            disabled={selected === null}
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-30 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            정답 확인
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all"
          >
            {currentIdx === questions.length - 1 ? "학습 완료" : "다음 문제"}
          </button>
        )}
      </div>
    </div>
  );
}