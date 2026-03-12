import { useState, useEffect, useRef } from 'react';

export default function AudioOverview({ data, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScriptIdx, setCurrentScriptIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // 닫을 때 오디오 중단
  const handleClose = () => {
    if (synth) synth.cancel();
    onClose();
  };

  // 특정 문장 재생
  const playText = (text, idx) => {
    if (!synth) return;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    
    utterance.onstart = () => {
      setIsPlaying(true);
      setCurrentScriptIdx(idx);
      // 진행률 계산 (문장 단위)
      setProgress(((idx + 1) / data.scripts.length) * 100);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      // 다음 문장이 있으면 자동 재생하고 싶다면 아래 주석 해제
      // if (idx < data.scripts.length - 1) playText(data.scripts[idx+1].content, idx + 1);
    };

    synth.speak(utterance);
  };

  const togglePlay = () => {
    if (isPlaying) {
      synth.pause();
      setIsPlaying(false);
    } else {
      if (synth.paused) {
        synth.resume();
        setIsPlaying(true);
      } else {
        playText(data.scripts[currentScriptIdx].content, currentScriptIdx);
      }
    }
  };

  const stopPlay = () => {
    synth.cancel();
    setIsPlaying(false);
    setProgress(0);
    setCurrentScriptIdx(0);
  };

  // 시간 조절(진행바) 클릭 시 해당 문장으로 이동
  const handleProgressChange = (e) => {
    const newProgress = e.target.value;
    const newIdx = Math.floor((newProgress / 100) * data.scripts.length);
    const safeIdx = Math.min(newIdx, data.scripts.length - 1);
    setProgress(newProgress);
    playText(data.scripts[safeIdx].content, safeIdx);
  };

  return (
    <div className="bg-white p-8 rounded-3xl max-h-[80vh] flex flex-col shadow-2xl border border-purple-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-purple-600 font-bold uppercase text-[10px] tracking-widest mb-1">AI Audio Overview</h2>
          <h3 className="text-xl font-extrabold text-gray-900">{data.title}</h3>
        </div>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* 오디오 컨트롤러 박스 */}
      <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={togglePlay} className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 shadow-lg transition-all">
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={stopPlay} className="w-10 h-10 bg-white text-gray-400 rounded-full border border-gray-200 flex items-center justify-center hover:text-red-500 transition-all">
            ■
          </button>
          <div className="flex-1">
            <input 
              type="range" 
              min="0" max="100" 
              value={progress} 
              onChange={handleProgressChange}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-bold">
              <span>PROGRESS: {Math.round(progress)}%</span>
              <span>{currentScriptIdx + 1} / {data.scripts.length} SENTENCES</span>
            </div>
          </div>
        </div>
      </div>

      {/* 대본 영역 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {data.scripts.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => playText(item.content, idx)}
            className={`p-4 rounded-2xl text-sm cursor-pointer transition-all border ${
              currentScriptIdx === idx && isPlaying 
              ? 'border-purple-300 bg-purple-50 scale-[1.02] shadow-sm' 
              : 'border-transparent bg-gray-50 hover:bg-gray-100'
            } ${item.speaker === '진행자 A' ? 'ml-0 mr-8' : 'ml-8 mr-0'}`}
          >
            <span className="text-[10px] font-black text-purple-400 uppercase block mb-1">{item.speaker}</span>
            <p className="leading-relaxed text-gray-700">{item.content}</p>
          </div>
        ))}
      </div>

      <button 
        onClick={handleClose}
        className="mt-6 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
      >
        학습 종료 및 닫기
      </button>
    </div>
  );
}